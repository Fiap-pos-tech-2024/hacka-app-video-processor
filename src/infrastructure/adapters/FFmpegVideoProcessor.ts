import { spawn } from 'child_process';
import archiver from 'archiver';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { VideoProcessorPort } from '../../domain/ports/VideoProcessorPort.js';
import { FileSystemPort } from '../../domain/ports/FileSystemPort.js';
import { StoragePort } from '../../domain/ports/StoragePort.js';

export class FFmpegVideoProcessor implements VideoProcessorPort {
  constructor(
    private readonly fileSystemPort: FileSystemPort,
    private readonly storagePort: StoragePort
  ) {}

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
  async createZipFromFrames(framesDir: string, outputPath: string, bucket: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const output = this.fileSystemPort.createWriteStream(outputPath);
        const archive = archiver('zip');

        output.on('close', async () => {
          try {
            console.log(`ZIP criado: ${outputPath} (${archive.pointer()} bytes)`);
            
            // Ler o arquivo ZIP criado
            const zipBuffer = await this.fileSystemPort.readFile(outputPath);
            
            // Gerar uma chave única para o S3
            const savedZipKey = `frames_${uuidv4()}.zip`;
            
            // Upload para S3
            await this.storagePort.uploadFile(bucket, savedZipKey, zipBuffer);
              console.log(`savedZipKey: ${savedZipKey}`);
            
            // Manter o arquivo local em outputs
            console.log(`Arquivo ZIP mantido em: ${outputPath}`);
            
            resolve(savedZipKey);
          } catch (error) {
            reject(error);
          }
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
