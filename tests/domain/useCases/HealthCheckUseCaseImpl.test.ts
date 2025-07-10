import { HealthCheckUseCaseImpl } from '../../../src/domain/useCases/HealthCheckUseCaseImpl.js';
import { QueuePort } from '../../../src/domain/ports/QueuePort.js';
import { StoragePort } from '../../../src/domain/ports/StoragePort.js';
import { VideoProcessorPort } from '../../../src/domain/ports/VideoProcessorPort.js';
import { ServiceHealth } from '../../../src/domain/useCases/HealthCheckUseCase.js';

describe('HealthCheckUseCaseImpl', () => {
  let healthCheckUseCase: HealthCheckUseCaseImpl;
  let mockQueuePort: jest.Mocked<QueuePort>;
  let mockStoragePort: jest.Mocked<StoragePort>;
  let mockVideoProcessorPort: jest.Mocked<VideoProcessorPort>;

  beforeEach(() => {
    mockQueuePort = {
      createQueue: jest.fn(),
      receiveMessages: jest.fn(),
      deleteMessage: jest.fn(),
    };

    mockStoragePort = {
      downloadFile: jest.fn(),
      uploadFile: jest.fn(),
    };

    mockVideoProcessorPort = {
      extractFrames: jest.fn(),
      createZipFromFrames: jest.fn(),
    };

    healthCheckUseCase = new HealthCheckUseCaseImpl(
      mockQueuePort,
      mockStoragePort,
      mockVideoProcessorPort
    );
  });

  describe('execute', () => {
    it('should return healthy status when all services are up', async () => {
      // Arrange
      mockQueuePort.createQueue.mockResolvedValue('queue-url');
      mockVideoProcessorPort.extractFrames.mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      // Act
      const result = await healthCheckUseCase.execute();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.services.sqs.status).toBe('up');
      expect(result.services.s3.status).toBe('up');
      expect(result.services.ffmpeg.status).toBe('up');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status when SQS is down', async () => {
      // Arrange
      mockQueuePort.createQueue.mockRejectedValue(new Error('SQS connection failed'));
      mockVideoProcessorPort.extractFrames.mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      // Act
      const result = await healthCheckUseCase.execute();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.sqs.status).toBe('down');
      expect(result.services.sqs.error).toBe('SQS connection failed');
      expect(result.services.s3.status).toBe('up');
      expect(result.services.ffmpeg.status).toBe('up');
    });

    it('should return unhealthy status when FFmpeg is down', async () => {
      // Arrange
      mockQueuePort.createQueue.mockResolvedValue('queue-url');
      mockVideoProcessorPort.extractFrames.mockRejectedValue(
        new Error('FFmpeg not found')
      );

      // Act
      const result = await healthCheckUseCase.execute();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.sqs.status).toBe('up');
      expect(result.services.s3.status).toBe('up');
      expect(result.services.ffmpeg.status).toBe('down');
      expect(result.services.ffmpeg.error).toBe('FFmpeg not found');
    });

    it('should return unhealthy status when multiple services are down', async () => {
      // Arrange
      mockQueuePort.createQueue.mockRejectedValue(new Error('SQS error'));
      mockVideoProcessorPort.extractFrames.mockRejectedValue(
        new Error('FFmpeg error')
      );

      // Act
      const result = await healthCheckUseCase.execute();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.sqs.status).toBe('down');
      expect(result.services.ffmpeg.status).toBe('down');
      expect(result.services.s3.status).toBe('up');
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      mockQueuePort.createQueue.mockRejectedValue('string error');
      mockVideoProcessorPort.extractFrames.mockRejectedValue(123);

      // Act
      const result = await healthCheckUseCase.execute();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.sqs.status).toBe('down');
      expect(result.services.sqs.error).toBe('Unknown error');
      expect(result.services.ffmpeg.status).toBe('down');
      expect(result.services.ffmpeg.error).toBe('Unknown error');
    });

    it('should include correct timestamp and uptime', async () => {
      // Arrange
      const startTime = Date.now();
      mockQueuePort.createQueue.mockResolvedValue('queue-url');
      mockVideoProcessorPort.extractFrames.mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      // Act
      const result = await healthCheckUseCase.execute();
      const endTime = Date.now();

      // Assert
      expect(new Date(result.timestamp).getTime()).toBeGreaterThanOrEqual(startTime);
      expect(new Date(result.timestamp).getTime()).toBeLessThanOrEqual(endTime);
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof result.uptime).toBe('number');
    });

    it('should handle S3 service errors', async () => {
      // Arrange
      mockQueuePort.createQueue.mockResolvedValue('queue-url');
      mockVideoProcessorPort.extractFrames.mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      // Simular erro no S3 através do próprio teste de promise rejection
      const originalPromiseAllSettled = Promise.allSettled;
      Promise.allSettled = jest.fn().mockResolvedValue([
        { status: 'fulfilled', value: { status: 'up', lastCheck: new Date().toISOString() } },
        { status: 'rejected', reason: new Error('S3 connection failed') },
        { status: 'fulfilled', value: { status: 'up', lastCheck: new Date().toISOString() } }
      ]);

      // Act
      const result = await healthCheckUseCase.execute();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services.s3.status).toBe('down');
      expect(result.services.s3.error).toBe('S3 connection failed');

      // Restore
      Promise.allSettled = originalPromiseAllSettled;
    });

    it('should set correct lastCheck timestamps', async () => {
      // Arrange
      const beforeTest = Date.now();
      mockQueuePort.createQueue.mockResolvedValue('queue-url');
      mockVideoProcessorPort.extractFrames.mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      // Act
      const result = await healthCheckUseCase.execute();
      const afterTest = Date.now();

      // Assert
      expect(result.services.sqs.lastCheck).toBeDefined();
      expect(result.services.s3.lastCheck).toBeDefined();
      expect(result.services.ffmpeg.lastCheck).toBeDefined();
      
      expect(new Date(result.services.sqs.lastCheck!).getTime()).toBeGreaterThanOrEqual(beforeTest);
      expect(new Date(result.services.sqs.lastCheck!).getTime()).toBeLessThanOrEqual(afterTest);
    });
  });
});
