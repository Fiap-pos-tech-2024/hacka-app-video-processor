import { NodeFileSystemAdapter } from '../../../src/infrastructure/adapters/NodeFileSystemAdapter.js';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
  }
}));

jest.mock('fs-extra', () => ({
  remove: jest.fn(),
  ensureDir: jest.fn(),
  createWriteStream: jest.fn(),
}));

describe('NodeFileSystemAdapter', () => {
  let adapter: NodeFileSystemAdapter;
  const mockFs = fs.promises as jest.Mocked<typeof fs.promises>;
  const mockFsExtra = fsExtra as jest.Mocked<typeof fsExtra>;

  beforeEach(() => {
    adapter = new NodeFileSystemAdapter();
    jest.clearAllMocks();
  });

  describe('mkdir', () => {
    it('should create directory recursively', async () => {
      // Arrange
      const dirPath = '/test/directory';
      mockFs.mkdir.mockResolvedValue(undefined);

      // Act
      await adapter.mkdir(dirPath);

      // Assert
      expect(mockFs.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it('should throw error when mkdir fails', async () => {
      // Arrange
      const dirPath = '/test/directory';
      const error = new Error('Permission denied');
      mockFs.mkdir.mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.mkdir(dirPath)).rejects.toThrow('Permission denied');
    });
  });

  describe('writeFile', () => {
    it('should write buffer to file successfully', async () => {
      // Arrange
      const filePath = '/test/path/file.txt';
      const buffer = Buffer.from('test content');
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act
      await adapter.writeFile(filePath, buffer);

      // Assert
      expect(mockFs.writeFile).toHaveBeenCalledWith(filePath, buffer);
    });

    it('should throw error when write fails', async () => {
      // Arrange
      const filePath = '/test/path/file.txt';
      const buffer = Buffer.from('test content');
      const error = new Error('Write failed');
      mockFs.writeFile.mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.writeFile(filePath, buffer)).rejects.toThrow('Write failed');
    });
  });

  describe('readFile', () => {
    it('should read file and return buffer', async () => {
      // Arrange
      const filePath = '/test/path/file.txt';
      const expectedBuffer = Buffer.from('file content');
      mockFs.readFile.mockResolvedValue(expectedBuffer);

      // Act
      const result = await adapter.readFile(filePath);

      // Assert
      expect(result).toBe(expectedBuffer);
      expect(mockFs.readFile).toHaveBeenCalledWith(filePath);
    });

    it('should throw error when read fails', async () => {
      // Arrange
      const filePath = '/test/path/file.txt';
      const error = new Error('File not found');
      mockFs.readFile.mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.readFile(filePath)).rejects.toThrow('File not found');
    });
  });

  describe('readdir', () => {
    it('should read directory and return file list', async () => {
      // Arrange
      const dirPath = '/test/directory';
      const expectedFiles = ['file1.txt', 'file2.txt'];
      (mockFs.readdir as any).mockResolvedValue(expectedFiles);

      // Act
      const result = await adapter.readdir(dirPath);

      // Assert
      expect(result).toEqual(expectedFiles);
      expect(mockFs.readdir).toHaveBeenCalledWith(dirPath);
    });

    it('should throw error when readdir fails', async () => {
      // Arrange
      const dirPath = '/test/directory';
      const error = new Error('Directory not found');
      mockFs.readdir.mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.readdir(dirPath)).rejects.toThrow('Directory not found');
    });
  });

  describe('remove', () => {
    it('should remove file or directory', async () => {
      // Arrange
      const path = '/test/path';
      (mockFsExtra.remove as any).mockResolvedValue(undefined);

      // Act
      await adapter.remove(path);

      // Assert
      expect(mockFsExtra.remove).toHaveBeenCalledWith(path);
    });
  });

  describe('ensureDir', () => {
    it('should ensure directory exists', async () => {
      // Arrange
      const dirPath = '/test/directory';
      (mockFsExtra.ensureDir as any).mockResolvedValue(undefined);

      // Act
      await adapter.ensureDir(dirPath);

      // Assert
      expect(mockFsExtra.ensureDir).toHaveBeenCalledWith(dirPath);
    });
  });

  describe('createWriteStream', () => {
    it('should create write stream', () => {
      // Arrange
      const filePath = '/test/file.txt';
      const mockStream = { write: jest.fn(), end: jest.fn() };
      (mockFsExtra.createWriteStream as any).mockReturnValue(mockStream);

      // Act
      const result = adapter.createWriteStream(filePath);

      // Assert
      expect(result).toBe(mockStream);
      expect(mockFsExtra.createWriteStream).toHaveBeenCalledWith(filePath);
    });
  });
});
