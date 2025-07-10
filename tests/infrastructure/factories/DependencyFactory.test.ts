import { DependencyFactory } from '../../../src/infrastructure/factories/DependencyFactory.js';
import { AppConfig } from '../../../src/infrastructure/config/AppConfig.js';

// Mock AWS SDKs
jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({}))
}));

describe('DependencyFactory', () => {
  let factory: DependencyFactory;
  let mockConfig: AppConfig;

  beforeEach(() => {
    mockConfig = {
      aws: {
        region: 'us-east-1',
        endpoint: 'http://localhost:4566',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret'
        }
      },
      s3: {
        forcePathStyle: true,
        bucket: 'test-bucket'
      },
      queue: {
        name: 'test-queue',
        url: 'http://localhost:4566/queue/test',
        checkIntervalMs: 5000
      }
    };

    factory = new DependencyFactory(mockConfig);
  });

  describe('createQueueAdapter', () => {
    it('should create AWSSQSAdapter instance', () => {
      // Act
      const queueAdapter = factory.createQueueAdapter();

      // Assert
      expect(queueAdapter).toBeDefined();
      expect(queueAdapter.constructor.name).toBe('AWSSQSAdapter');
    });
  });

  describe('createStorageAdapter', () => {
    it('should create AWSS3Adapter instance', () => {
      // Act
      const storageAdapter = factory.createStorageAdapter();

      // Assert
      expect(storageAdapter).toBeDefined();
      expect(storageAdapter.constructor.name).toBe('AWSS3Adapter');
    });
  });

  describe('createFileSystemAdapter', () => {
    it('should create NodeFileSystemAdapter instance', () => {
      // Act
      const fileSystemAdapter = factory.createFileSystemAdapter();

      // Assert
      expect(fileSystemAdapter).toBeDefined();
      expect(fileSystemAdapter.constructor.name).toBe('NodeFileSystemAdapter');
    });
  });

  describe('createVideoProcessorAdapter', () => {
    it('should create FFmpegVideoProcessor instance', () => {
      // Act
      const videoProcessorAdapter = factory.createVideoProcessorAdapter();

      // Assert
      expect(videoProcessorAdapter).toBeDefined();
      expect(videoProcessorAdapter.constructor.name).toBe('FFmpegVideoProcessor');
    });
  });

  describe('createNotificationAdapter', () => {
    it('should create ConsoleNotificationAdapter instance', () => {
      // Act
      const notificationAdapter = factory.createNotificationAdapter();

      // Assert
      expect(notificationAdapter).toBeDefined();
      expect(notificationAdapter.constructor.name).toBe('ConsoleNotificationAdapter');
    });
  });

  describe('createProcessVideoUseCase', () => {
    it('should create ProcessVideoUseCase instance with all dependencies', () => {
      // Act
      const processVideoUseCase = factory.createProcessVideoUseCase();

      // Assert
      expect(processVideoUseCase).toBeDefined();
      expect(processVideoUseCase.constructor.name).toBe('ProcessVideoUseCase');
    });
  });

  describe('createCreateQueueUseCase', () => {
    it('should create CreateQueueUseCase instance', () => {
      // Act
      const createQueueUseCase = factory.createCreateQueueUseCase();

      // Assert
      expect(createQueueUseCase).toBeDefined();
      expect(createQueueUseCase.constructor.name).toBe('CreateQueueUseCase');
    });
  });

  describe('createHealthCheckUseCase', () => {
    it('should create HealthCheckUseCaseImpl instance', () => {
      // Act
      const healthCheckUseCase = factory.createHealthCheckUseCase();

      // Assert
      expect(healthCheckUseCase).toBeDefined();
      expect(healthCheckUseCase.constructor.name).toBe('HealthCheckUseCaseImpl');
    });
  });

  describe('createHttpServer', () => {
    it('should create ExpressServerAdapter instance', () => {
      // Act
      const httpServer = factory.createHttpServer();

      // Assert
      expect(httpServer).toBeDefined();
      expect(httpServer.constructor.name).toBe('ExpressServerAdapter');
    });
  });

  describe('AWS Client Configuration', () => {
    it('should create SQS client with correct region', () => {
      // Act
      factory.createQueueAdapter();

      // Assert
      const { SQSClient } = require('@aws-sdk/client-sqs');
      expect(SQSClient).toHaveBeenCalledWith({
        region: 'us-east-1'
      });
    });

    it('should create S3 client with correct configuration', () => {
      // Act
      factory.createStorageAdapter();

      // Assert
      const { S3Client } = require('@aws-sdk/client-s3');
      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        forcePathStyle: false
      });
    });
  });

  describe('Integration', () => {
    it('should create all components without errors', () => {
      // Act & Assert - should not throw
      expect(() => {
        factory.createQueueAdapter();
        factory.createStorageAdapter();
        factory.createFileSystemAdapter();
        factory.createVideoProcessorAdapter();
        factory.createNotificationAdapter();
        factory.createProcessVideoUseCase();
        factory.createCreateQueueUseCase();
        factory.createHealthCheckUseCase();
        factory.createHttpServer();
      }).not.toThrow();
    });

    it('should create independent instances', () => {
      // Act
      const adapter1 = factory.createQueueAdapter();
      const adapter2 = factory.createQueueAdapter();

      // Assert
      expect(adapter1).not.toBe(adapter2);
      expect(adapter1).toEqual(adapter2);
    });
  });
});
