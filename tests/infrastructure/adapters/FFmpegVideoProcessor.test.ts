import { FFmpegVideoProcessor } from '../../../src/infrastructure/adapters/FFmpegVideoProcessor.js';
import { FileSystemPort } from '../../../src/domain/ports/FileSystemPort.js';
import { StoragePort } from '../../../src/domain/ports/StoragePort.js';
import { spawn } from 'child_process';
import archiver from 'archiver';
import path from 'path';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('child_process');
jest.mock('archiver');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-123')
}));

describe('FFmpegVideoProcessor', () => {
  let processor: FFmpegVideoProcessor;
  let mockFileSystemPort: jest.Mocked<FileSystemPort>;
  let mockStoragePort: jest.Mocked<StoragePort>;
  let mockSpawn: jest.MockedFunction<typeof spawn>;
  let mockArchiver: jest.MockedFunction<typeof archiver>;
  let consoleSpy: jest.SpyInstance;

  const bucket = 'test-bucket';

  beforeEach(() => {
    // Mock FileSystemPort
    mockFileSystemPort = {
      readdir: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      createWriteStream: jest.fn(),
      mkdir: jest.fn(),
      remove: jest.fn(),
      ensureDir: jest.fn()
    };

    // Mock StoragePort
    mockStoragePort = {
      downloadFile: jest.fn(),
      uploadFile: jest.fn()
    };

    // Mock spawn
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

    // Mock archiver
    mockArchiver = archiver as jest.MockedFunction<typeof archiver>;

    processor = new FFmpegVideoProcessor(mockFileSystemPort, mockStoragePort, bucket);

    // Capturar logs do console
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('extractFrames', () => {
    it('deve extrair frames com sucesso', async () => {
      // Arrange
      const inputPath = '/path/to/video.mp4';
      const outputDir = '/path/to/output';
      const expectedFrames = ['frame_0001.png', 'frame_0002.png', 'frame_0003.png'];

      // Mock do processo FFmpeg
      const mockFFmpegProcess = new EventEmitter() as any;
      mockFFmpegProcess.on = jest.fn().mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          // Simular sucesso (código 0)
          setTimeout(() => callback(0), 10);
        }
        return mockFFmpegProcess;
      });

      mockSpawn.mockReturnValue(mockFFmpegProcess);
      mockFileSystemPort.readdir.mockResolvedValue(expectedFrames);

      // Act
      const result = await processor.extractFrames(inputPath, outputDir);

      // Assert
      expect(result).toEqual(expectedFrames);
      expect(mockSpawn).toHaveBeenCalledWith('ffmpeg', [
        '-i', inputPath,
        '-vf', 'fps=1',
        '-y',
        path.join(outputDir, 'frame_%04d.png')
      ]);
      expect(mockFileSystemPort.readdir).toHaveBeenCalledWith(outputDir);
    });

    it('deve falhar quando FFmpeg retorna código de erro', async () => {
      // Arrange
      const inputPath = '/path/to/video.mp4';
      const outputDir = '/path/to/output';

      const mockFFmpegProcess = new EventEmitter() as any;
      mockFFmpegProcess.on = jest.fn().mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          // Simular erro (código 1)
          setTimeout(() => callback(1), 10);
        }
        return mockFFmpegProcess;
      });

      mockSpawn.mockReturnValue(mockFFmpegProcess);

      // Act & Assert
      await expect(processor.extractFrames(inputPath, outputDir)).rejects.toThrow(
        'FFmpeg process exited with code 1'
      );
    });

    it('deve falhar quando há erro ao ler diretório após extração', async () => {
      // Arrange
      const inputPath = '/path/to/video.mp4';
      const outputDir = '/path/to/output';

      const mockFFmpegProcess = new EventEmitter() as any;
      mockFFmpegProcess.on = jest.fn().mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
        return mockFFmpegProcess;
      });

      mockSpawn.mockReturnValue(mockFFmpegProcess);
      mockFileSystemPort.readdir.mockRejectedValue(new Error('Cannot read directory'));

      // Act & Assert
      await expect(processor.extractFrames(inputPath, outputDir)).rejects.toThrow(
        'Cannot read directory'
      );
    });

    it('deve falhar quando há erro no spawn do FFmpeg', async () => {
      // Arrange
      const inputPath = '/path/to/video.mp4';
      const outputDir = '/path/to/output';

      const mockFFmpegProcess = new EventEmitter() as any;
      mockFFmpegProcess.on = jest.fn().mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('spawn ENOENT')), 10);
        }
        return mockFFmpegProcess;
      });

      mockSpawn.mockReturnValue(mockFFmpegProcess);

      // Act & Assert
      await expect(processor.extractFrames(inputPath, outputDir)).rejects.toThrow(
        'FFmpeg spawn error: spawn ENOENT'
      );
    });
  });

  describe('createZipFromFrames', () => {
    it('deve criar ZIP e fazer upload com sucesso', async () => {
      // Arrange
      const framesDir = '/path/to/frames';
      const outputPath = '/path/to/output.zip';
      const frames = ['frame_0001.png', 'frame_0002.png'];
      const zipBuffer = Buffer.from('zip content');

      // Mock do stream de escrita
      const mockWriteStream = new EventEmitter() as any;
      mockFileSystemPort.createWriteStream.mockReturnValue(mockWriteStream);

      // Mock do archiver
      const mockArchiverInstance = new EventEmitter() as any;
      mockArchiverInstance.pointer = jest.fn().mockReturnValue(1024);
      mockArchiverInstance.pipe = jest.fn();
      mockArchiverInstance.file = jest.fn();
      mockArchiverInstance.finalize = jest.fn().mockResolvedValue(undefined);
      mockArchiver.mockReturnValue(mockArchiverInstance);

      mockFileSystemPort.readdir.mockResolvedValue(frames);
      mockFileSystemPort.readFile.mockResolvedValue(zipBuffer);
      mockStoragePort.uploadFile.mockResolvedValue();

      // Act
      const resultPromise = processor.createZipFromFrames(framesDir, outputPath, bucket);

      // Simular que o stream foi fechado
      setTimeout(() => {
        mockWriteStream.emit('close');
      }, 10);

      const result = await resultPromise;

      // Assert
      expect(result).toBe('frames_mocked-uuid-123.zip');
      expect(mockFileSystemPort.createWriteStream).toHaveBeenCalledWith(outputPath);
      expect(mockArchiver).toHaveBeenCalledWith('zip');
      expect(mockFileSystemPort.readFile).toHaveBeenCalledWith(outputPath);
      expect(mockStoragePort.uploadFile).toHaveBeenCalledWith(
        bucket,
        'frames_mocked-uuid-123.zip',
        zipBuffer
      );
      expect(console.log).toHaveBeenCalledWith(`ZIP criado: ${outputPath} (1024 bytes)`);
      expect(console.log).toHaveBeenCalledWith(
        `URL completa: https://${bucket}.s3.us-east-1.amazonaws.com/frames_mocked-uuid-123.zip`
      );
    });

    it('deve falhar quando há erro no archiver', async () => {
      // Arrange
      const framesDir = '/path/to/frames';
      const outputPath = '/path/to/output.zip';
      const frames = ['frame_0001.png'];

      const mockWriteStream = new EventEmitter() as any;
      mockFileSystemPort.createWriteStream.mockReturnValue(mockWriteStream);

      const mockArchiverInstance = new EventEmitter() as any;
      mockArchiverInstance.pipe = jest.fn();
      mockArchiverInstance.file = jest.fn();
      mockArchiverInstance.finalize = jest.fn();
      mockArchiver.mockReturnValue(mockArchiverInstance);

      mockFileSystemPort.readdir.mockResolvedValue(frames);

      // Act
      const resultPromise = processor.createZipFromFrames(framesDir, outputPath, bucket);

      // Simular erro no archiver
      setTimeout(() => {
        mockArchiverInstance.emit('error', new Error('Archiver error'));
      }, 10);

      // Assert
      await expect(resultPromise).rejects.toThrow('Archiver error');
    });

    it('deve falhar quando há erro ao ler frames do diretório', async () => {
      // Arrange
      const framesDir = '/path/to/frames';
      const outputPath = '/path/to/output.zip';

      const mockWriteStream = new EventEmitter() as any;
      mockFileSystemPort.createWriteStream.mockReturnValue(mockWriteStream);

      const mockArchiverInstance = new EventEmitter() as any;
      mockArchiverInstance.pipe = jest.fn();
      mockArchiver.mockReturnValue(mockArchiverInstance);

      mockFileSystemPort.readdir.mockRejectedValue(new Error('Cannot read frames directory'));

      // Act & Assert
      await expect(processor.createZipFromFrames(framesDir, outputPath, bucket)).rejects.toThrow(
        'Cannot read frames directory'
      );
    });

    it('deve falhar quando há erro ao ler arquivo ZIP', async () => {
      // Arrange
      const framesDir = '/path/to/frames';
      const outputPath = '/path/to/output.zip';
      const frames = ['frame_0001.png'];

      const mockWriteStream = new EventEmitter() as any;
      mockFileSystemPort.createWriteStream.mockReturnValue(mockWriteStream);

      const mockArchiverInstance = new EventEmitter() as any;
      mockArchiverInstance.pointer = jest.fn().mockReturnValue(1024);
      mockArchiverInstance.pipe = jest.fn();
      mockArchiverInstance.file = jest.fn();
      mockArchiverInstance.finalize = jest.fn().mockResolvedValue(undefined);
      mockArchiver.mockReturnValue(mockArchiverInstance);

      mockFileSystemPort.readdir.mockResolvedValue(frames);
      mockFileSystemPort.readFile.mockRejectedValue(new Error('Cannot read ZIP file'));

      // Act
      const resultPromise = processor.createZipFromFrames(framesDir, outputPath, bucket);

      // Simular que o stream foi fechado
      setTimeout(() => {
        mockWriteStream.emit('close');
      }, 10);

      // Assert
      await expect(resultPromise).rejects.toThrow('Cannot read ZIP file');
    });

    it('deve falhar quando há erro no upload para S3', async () => {
      // Arrange
      const framesDir = '/path/to/frames';
      const outputPath = '/path/to/output.zip';
      const frames = ['frame_0001.png'];
      const zipBuffer = Buffer.from('zip content');

      const mockWriteStream = new EventEmitter() as any;
      mockFileSystemPort.createWriteStream.mockReturnValue(mockWriteStream);

      const mockArchiverInstance = new EventEmitter() as any;
      mockArchiverInstance.pointer = jest.fn().mockReturnValue(1024);
      mockArchiverInstance.pipe = jest.fn();
      mockArchiverInstance.file = jest.fn();
      mockArchiverInstance.finalize = jest.fn().mockResolvedValue(undefined);
      mockArchiver.mockReturnValue(mockArchiverInstance);

      mockFileSystemPort.readdir.mockResolvedValue(frames);
      mockFileSystemPort.readFile.mockResolvedValue(zipBuffer);
      mockStoragePort.uploadFile.mockRejectedValue(new Error('S3 upload failed'));

      // Act
      const resultPromise = processor.createZipFromFrames(framesDir, outputPath, bucket);

      // Simular que o stream foi fechado
      setTimeout(() => {
        mockWriteStream.emit('close');
      }, 10);

      // Assert
      await expect(resultPromise).rejects.toThrow('S3 upload failed');
    });
  });

  describe('buildS3Url', () => {
    it('deve construir URL S3 corretamente', async () => {
      // Arrange
      const framesDir = '/path/to/frames';
      const outputPath = '/path/to/output.zip';
      const frames = ['frame_0001.png'];
      const zipBuffer = Buffer.from('zip content');

      const mockWriteStream = new EventEmitter() as any;
      mockFileSystemPort.createWriteStream.mockReturnValue(mockWriteStream);

      const mockArchiverInstance = new EventEmitter() as any;
      mockArchiverInstance.pointer = jest.fn().mockReturnValue(1024);
      mockArchiverInstance.pipe = jest.fn();
      mockArchiverInstance.file = jest.fn();
      mockArchiverInstance.finalize = jest.fn().mockResolvedValue(undefined);
      mockArchiver.mockReturnValue(mockArchiverInstance);

      mockFileSystemPort.readdir.mockResolvedValue(frames);
      mockFileSystemPort.readFile.mockResolvedValue(zipBuffer);
      mockStoragePort.uploadFile.mockResolvedValue();

      // Act
      const resultPromise = processor.createZipFromFrames(framesDir, outputPath, bucket);

      setTimeout(() => {
        mockWriteStream.emit('close');
      }, 10);

      await resultPromise;

      // Assert - Verificar se a URL foi construída corretamente
      expect(console.log).toHaveBeenCalledWith(
        `URL completa: https://${bucket}.s3.us-east-1.amazonaws.com/frames_mocked-uuid-123.zip`
      );
    });
  });
});
