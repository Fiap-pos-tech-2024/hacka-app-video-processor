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
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    // ✅ Set required env var for ConsoleNotificationAdapter
    process.env.BASE_PATH_EXTERNAL_API = 'http://localhost:3001';

    // ✅ Global fetch mock (necessário para ConsoleNotificationAdapter)
    fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      text: async () => 'ok'
    });

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

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.BASE_PATH_EXTERNAL_API;
  });

  describe('createQueueAdapter', () => {
    it('should create AWSSQSAdapter instance', () => {
      const queueAdapter = factory.createQueueAdapter();
      expect(queueAdapter).toBeDefined();
      expect(queueAdapter.constructor.name).toBe('AWSSQSAdapter');
    });
  });

  describe('createStorageAdapter', () => {
    it('should create AWSS3Adapter instance', () => {
      const storageAdapter = factory.createStorageAdapter();
      expect(storageAdapter).toBeDefined();
      expect(storageAdapter.constructor.name).toBe('AWSS3Adapter');
    });
  });

  describe('createFileSystemAdapter', () => {
    it('should create NodeFileSystemAdapter instance', () => {
      const fileSystemAdapter = factory.createFileSystemAdapter();
      expect(fileSystemAdapter).toBeDefined();
      expect(fileSystemAdapter.constructor.name).toBe('NodeFileSystemAdapter');
    });
  });

  describe('createVideoProcessorAdapter', () => {
    it('should create FFmpegVideoProcessor instance', () => {
      const videoProcessorAdapter = factory.createVideoProcessorAdapter();
      expect(videoProcessorAdapter).toBeDefined();
      expect(videoProcessorAdapter.constructor.name).toBe('FFmpegVideoProcessor');
    });
  });

  describe('createNotificationAdapter', () => {
    it('should create ConsoleNotificationAdapter instance', () => {
      const notificationAdapter = factory.createNotificationAdapter();
      expect(notificationAdapter).toBeDefined();
      expect(notificationAdapter.constructor.name).toBe('ConsoleNotificationAdapter');
    });
  });

  describe('createProcessVideoUseCase', () => {
    it('should create ProcessVideoUseCase instance with all dependencies', () => {
      const processVideoUseCase = factory.createProcessVideoUseCase();
      expect(processVideoUseCase).toBeDefined();
      expect(processVideoUseCase.constructor.name).toBe('ProcessVideoUseCase');
    });
  });

  describe('createCreateQueueUseCase', () => {
    it('should create CreateQueueUseCase instance', () => {
      const createQueueUseCase = factory.createCreateQueueUseCase();
      expect(createQueueUseCase).toBeDefined();
      expect(createQueueUseCase.constructor.name).toBe('CreateQueueUseCase');
    });
  });

  describe('createHealthCheckUseCase', () => {
    it('should create HealthCheckUseCaseImpl instance', () => {
      const healthCheckUseCase = factory.createHealthCheckUseCase();
      expect(healthCheckUseCase).toBeDefined();
      expect(healthCheckUseCase.constructor.name).toBe('HealthCheckUseCaseImpl');
    });
  });

  describe('createHttpServer', () => {
    it('should create ExpressServerAdapter instance', () => {
      const httpServer = factory.createHttpServer();
      expect(httpServer).toBeDefined();
      expect(httpServer.constructor.name).toBe('ExpressServerAdapter');
    });
  });

  describe('AWS Client Configuration', () => {
    it('should create SQS client with correct region', () => {
      factory.createQueueAdapter();
      const { SQSClient } = require('@aws-sdk/client-sqs');
      expect(SQSClient).toHaveBeenCalledWith({
        region: 'us-east-1'
      });
    });

    it('should create S3 client with correct configuration', () => {
      factory.createStorageAdapter();
      const { S3Client } = require('@aws-sdk/client-s3');
      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        forcePathStyle: false // ⚠️ Depende da lógica interna do seu Factory
      });
    });
  });

  describe('Integration', () => {
    it('should create all components without errors', () => {
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
      const adapter1 = factory.createQueueAdapter();
      const adapter2 = factory.createQueueAdapter();
      expect(adapter1).not.toBe(adapter2);
      expect(adapter1).toEqual(adapter2);
    });
  });
});
