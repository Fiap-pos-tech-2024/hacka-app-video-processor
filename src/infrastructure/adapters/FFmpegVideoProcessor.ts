import { spawn } from 'child_process';
import archiver from 'archiver';
import path from 'path';
import { VideoProcessorPort } from '../../domain/ports/VideoProcessorPort.js';
import { FileSystemPort } from '../../domain/ports/FileSystemPort.js';

export class FFmpegVideoProcessor implements VideoProcessorPort {
  constructor(private readonly fileSystemPort: FileSystemPort) {}

  async extractFrames(inputPath: string, outputDir: string): Promise<string[]> {
    const framePattern = path.join(outputDir, 'frame_%04d.png');
    
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-vf', 'fps=1',
        '-y',
        framePattern
      ]);

      ffmpeg.on('close', async (code: number) => {
        if (code === 0) {
          try {
            const frames = await this.fileSystemPort.readdir(outputDir);
            resolve(frames);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  }

  async createZipFromFrames(framesDir: string, outputPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const output = this.fileSystemPort.createWriteStream(outputPath);
        const archive = archiver('zip');

        output.on('close', () => {
          console.log(`ZIP criado: ${outputPath} (${archive.pointer()} bytes)`);
          resolve();
        });

        archive.on('error', (error) => {
          reject(error);
        });

        archive.pipe(output);

        const frames = await this.fileSystemPort.readdir(framesDir);
        frames.forEach((frame: string) => {
          archive.file(path.join(framesDir, frame), { name: frame });
        });

        await archive.finalize();
      } catch (error) {
        reject(error);
      }
    });
  }
}
