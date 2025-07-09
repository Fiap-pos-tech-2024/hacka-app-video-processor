import { VideoProcessingService } from '../../../src/application/services/VideoProcessingService.js';

// Mock dos casos de uso
const createMockProcessVideoUseCase = () => ({
  execute: jest.fn()
});

const createMockCreateQueueUseCase = () => ({
  execute: jest.fn()
});

// Mock do setInterval
const mockSetInterval = jest.fn();
global.setInterval = mockSetInterval;

describe('VideoProcessingService', () => {
  let service: VideoProcessingService;
  let mockProcessVideoUseCase: ReturnType<typeof createMockProcessVideoUseCase>;
  let mockCreateQueueUseCase: ReturnType<typeof createMockCreateQueueUseCase>;
  const queueName = 'test-queue';
  const checkIntervalMs = 1000;

  beforeEach(() => {
    mockProcessVideoUseCase = createMockProcessVideoUseCase();
    mockCreateQueueUseCase = createMockCreateQueueUseCase();
    
    service = new VideoProcessingService(
      mockProcessVideoUseCase as any,
      mockCreateQueueUseCase as any,
      queueName,
      checkIntervalMs
    );
    jest.clearAllMocks();
  });

  describe('start', () => {    it('should start service successfully', async () => {
      // Arrange
      const queueUrl = 'http://localhost:4566/queue/test-queue';
      mockCreateQueueUseCase.execute.mockResolvedValue(queueUrl);
      mockProcessVideoUseCase.execute.mockResolvedValue(undefined);

      // Act
      await service.start();

      // Assert
      expect(mockCreateQueueUseCase.execute).toHaveBeenCalledWith(queueName);
      expect(mockProcessVideoUseCase.execute).toHaveBeenCalledWith(queueUrl);
      expect(mockSetInterval).toHaveBeenCalledWith(
        expect.any(Function),
        checkIntervalMs
      );
    });

    it('should handle queue creation failure', async () => {
      // Arrange
      mockCreateQueueUseCase.execute.mockResolvedValue(undefined);

      // Act
      await service.start();

      // Assert
      expect(mockCreateQueueUseCase.execute).toHaveBeenCalledWith(queueName);
      expect(mockProcessVideoUseCase.execute).not.toHaveBeenCalled();
      expect(mockSetInterval).not.toHaveBeenCalled();
    });

    it('should handle queue creation with null result', async () => {
      // Arrange
      mockCreateQueueUseCase.execute.mockResolvedValue(null as any);

      // Act
      await service.start();

      // Assert
      expect(mockCreateQueueUseCase.execute).toHaveBeenCalledWith(queueName);
      expect(mockProcessVideoUseCase.execute).not.toHaveBeenCalled();
      expect(mockSetInterval).not.toHaveBeenCalled();
    });    it('should process messages immediately after queue creation', async () => {
      // Arrange
      const queueUrl = 'http://localhost:4566/queue/test-queue';
      mockCreateQueueUseCase.execute.mockResolvedValue(queueUrl);
      mockProcessVideoUseCase.execute.mockResolvedValue(undefined);

      // Act
      await service.start();

      // Assert
      expect(mockProcessVideoUseCase.execute).toHaveBeenCalledWith(queueUrl);
      expect(mockProcessVideoUseCase.execute).toHaveBeenCalledTimes(1); // Called immediately
    });

    it('should setup interval for recurring message processing', async () => {
      // Arrange
      const queueUrl = 'http://localhost:4566/queue/test-queue';
      mockCreateQueueUseCase.execute.mockResolvedValue(queueUrl);
      mockProcessVideoUseCase.execute.mockResolvedValue(undefined);

      // Act
      await service.start();

      // Assert
      expect(mockSetInterval).toHaveBeenCalledWith(
        expect.any(Function),
        checkIntervalMs
      );

      // Test that the interval callback calls processVideoUseCase
      const intervalCallback = mockSetInterval.mock.calls[0][0];
      await intervalCallback();
      
      expect(mockProcessVideoUseCase.execute).toHaveBeenCalledTimes(2); // Once immediate, once from interval
    });

    it('should handle processVideoUseCase errors gracefully', async () => {
      // Arrange
      const queueUrl = 'http://localhost:4566/queue/test-queue';
      mockCreateQueueUseCase.execute.mockResolvedValue(queueUrl);
      mockProcessVideoUseCase.execute.mockRejectedValue(new Error('Processing failed'));

      // Act
      await service.start();

      // Assert
      expect(mockCreateQueueUseCase.execute).toHaveBeenCalledWith(queueName);
      expect(mockProcessVideoUseCase.execute).toHaveBeenCalledWith(queueUrl);
      expect(mockSetInterval).toHaveBeenCalled(); // Service should continue even if initial processing fails
    });
  });

  describe('Constructor', () => {
    it('should create service with correct parameters', () => {
      const mockProcess = createMockProcessVideoUseCase();
      const mockCreate = createMockCreateQueueUseCase();
      
      const customService = new VideoProcessingService(
        mockProcess as any,
        mockCreate as any,
        'custom-queue',
        5000
      );

      expect(customService).toBeInstanceOf(VideoProcessingService);
    });
  });
  describe('Interval Processing', () => {
    it('should handle interval processing errors without crashing', async () => {
      // Arrange
      const queueUrl = 'http://localhost:4566/queue/test-queue';
      mockCreateQueueUseCase.execute.mockResolvedValue(queueUrl);
      mockProcessVideoUseCase.execute
        .mockResolvedValueOnce(undefined) // First call succeeds
        .mockRejectedValueOnce(new Error('Interval processing failed')); // Second call fails

      // Act
      await service.start();

      // Get the interval callback and simulate an error
      const intervalCallback = mockSetInterval.mock.calls[0][0];
      
      // Should not throw (error is caught internally)
      await intervalCallback();
      
      // Assert
      expect(mockProcessVideoUseCase.execute).toHaveBeenCalledTimes(2);
    });
  });
});
