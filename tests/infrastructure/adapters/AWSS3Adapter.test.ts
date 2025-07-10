import { AWSS3Adapter } from '../../../src/infrastructure/adapters/AWSS3Adapter.js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

// Mock do S3Client
jest.mock('@aws-sdk/client-s3');

describe('AWSS3Adapter', () => {
  let adapter: AWSS3Adapter;
  let mockS3Client: jest.Mocked<S3Client>;
  let consoleSpy: jest.SpyInstance;
  let mockSend: jest.Mock;

  beforeEach(() => {
    // Criar mock do send
    mockSend = jest.fn();
    
    // Criar mock do S3Client
    mockS3Client = {
      send: mockSend,
      config: {
        endpoint: 'https://s3.us-east-1.amazonaws.com'
      }
    } as any;

    adapter = new AWSS3Adapter(mockS3Client);

    // Capturar logs do console
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('downloadFile', () => {
    it('deve baixar arquivo com sucesso quando body é um stream legível', async () => {
      // Arrange
      const bucket = 'test-bucket';
      const key = 'test-file.txt';
      const expectedContent = Buffer.from('test content');
      
      // Criar um stream mock
      const mockStream = new Readable({
        read() {
          this.push(expectedContent);
          this.push(null);
        }
      });

      mockSend.mockResolvedValue({
        Body: mockStream
      });

      // Act
      const result = await adapter.downloadFile(bucket, key);

      // Assert
      expect(result).toEqual(expectedContent);
      expect(mockSend).toHaveBeenCalledWith(
        expect.any(GetObjectCommand)
      );
      expect(console.log).toHaveBeenCalledWith('URLs de download do S3:');
      expect(console.log).toHaveBeenCalledWith(`Bucket: ${bucket}`);
      expect(console.log).toHaveBeenCalledWith(`Key: ${key}`);
      expect(console.log).toHaveBeenCalledWith('Arquivo baixado com sucesso do S3!');
    });

    it('deve baixar arquivo com chunks de diferentes tipos', async () => {
      // Arrange
      const bucket = 'test-bucket';
      const key = 'test-file.txt';
      const chunk1 = Buffer.from('test ');
      const chunk2 = 'content'; // String que será convertida para Buffer
      
      const mockStream = new Readable({
        read() {
          this.push(chunk1);
          this.push(chunk2);
          this.push(null);
        }
      });

      mockSend.mockResolvedValue({
        Body: mockStream
      });

      // Act
      const result = await adapter.downloadFile(bucket, key);

      // Assert
      expect(result).toEqual(Buffer.from('test content'));
      expect(console.log).toHaveBeenCalledWith('Arquivo baixado com sucesso do S3!');
    });

    it('deve retornar undefined quando body não é um stream legível', async () => {
      // Arrange
      const bucket = 'test-bucket';
      const key = 'test-file.txt';

      mockSend.mockResolvedValue({
        Body: 'not a stream'
      });

      // Act
      const result = await adapter.downloadFile(bucket, key);

      // Assert
      expect(result).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith('Body não é um stream legível.');
    });

    it('deve propagar erro quando S3 falha', async () => {
      // Arrange
      const bucket = 'test-bucket';
      const key = 'test-file.txt';
      const expectedError = new Error('S3 Error');

      mockSend.mockRejectedValue(expectedError);

      // Act & Assert
      await expect(adapter.downloadFile(bucket, key)).rejects.toThrow('S3 Error');
      expect(console.error).toHaveBeenCalledWith('Erro ao baixar arquivo do S3:', expectedError);
    });

    it('deve usar endpoint padrão quando não configurado', async () => {
      // Arrange
      mockS3Client.config.endpoint = undefined;
      const bucket = 'test-bucket';
      const key = 'test-file.txt';
      
      const mockStream = new Readable({
        read() {
          this.push(Buffer.from('test'));
          this.push(null);
        }
      });

      mockSend.mockResolvedValue({
        Body: mockStream
      });

      // Act
      await adapter.downloadFile(bucket, key);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        'S3 Endpoint: https://s3.us-east-1.amazonaws.com'
      );
    });
  });

  describe('uploadFile', () => {
    it('deve fazer upload do arquivo com sucesso', async () => {
      // Arrange
      const bucket = 'test-bucket';
      const key = 'test-file.txt';
      const buffer = Buffer.from('test content');

      mockSend.mockResolvedValue({});

      // Act
      await adapter.uploadFile(bucket, key, buffer);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.any(PutObjectCommand)
      );
      expect(console.log).toHaveBeenCalledWith('URLs de upload para S3:');
      expect(console.log).toHaveBeenCalledWith(`Bucket: ${bucket}`);
      expect(console.log).toHaveBeenCalledWith(`Key: ${key}`);
      expect(console.log).toHaveBeenCalledWith(`Tamanho do arquivo: ${buffer.length} bytes`);
      expect(console.log).toHaveBeenCalledWith('Arquivo enviado com sucesso para S3!');
    });

    it('deve propagar erro quando upload falha', async () => {
      // Arrange
      const bucket = 'test-bucket';
      const key = 'test-file.txt';
      const buffer = Buffer.from('test content');
      const expectedError = new Error('Upload failed');

      mockSend.mockRejectedValue(expectedError);

      // Act & Assert
      await expect(adapter.uploadFile(bucket, key, buffer)).rejects.toThrow('Upload failed');
      expect(console.error).toHaveBeenCalledWith('Erro ao enviar arquivo para S3:', expectedError);
    });

    it('deve usar endpoint padrão quando não configurado no upload', async () => {
      // Arrange
      mockS3Client.config.endpoint = undefined;
      const bucket = 'test-bucket';
      const key = 'test-file.txt';
      const buffer = Buffer.from('test content');

      mockSend.mockResolvedValue({});

      // Act
      await adapter.uploadFile(bucket, key, buffer);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        'S3 Endpoint: https://s3.us-east-1.amazonaws.com'
      );
    });
  });

  describe('buildS3Url', () => {
    it('deve construir URL S3 corretamente', async () => {
      // Arrange
      const bucket = 'my-bucket';
      const key = 'path/to/file.txt';
      
      const mockStream = new Readable({
        read() {
          this.push(Buffer.from('test'));
          this.push(null);
        }
      });

      mockSend.mockResolvedValue({
        Body: mockStream
      });

      // Act
      await adapter.downloadFile(bucket, key);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        `URL completa: https://${bucket}.s3.us-east-1.amazonaws.com/${key}`
      );
    });
  });
});
