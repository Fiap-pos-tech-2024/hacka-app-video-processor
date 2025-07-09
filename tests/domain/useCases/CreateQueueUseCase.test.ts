import { CreateQueueUseCase } from '../../../src/domain/useCases/CreateQueueUseCase.js';
import { MockQueuePort } from '../../mocks/ports.js';

describe('CreateQueueUseCase', () => {
  let useCase: CreateQueueUseCase;
  let mockQueuePort: MockQueuePort;

  beforeEach(() => {
    mockQueuePort = new MockQueuePort();
    useCase = new CreateQueueUseCase(mockQueuePort);
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should create queue successfully', async () => {
      // Arrange
      const queueName = 'test-queue';
      const expectedQueueUrl = 'http://localhost:4566/queue/test-queue';
      mockQueuePort.createQueue.mockResolvedValue(expectedQueueUrl);

      // Act
      const result = await useCase.execute(queueName);

      // Assert
      expect(mockQueuePort.createQueue).toHaveBeenCalledWith(queueName);
      expect(mockQueuePort.createQueue).toHaveBeenCalledTimes(1);
      expect(result).toBe(expectedQueueUrl);
    });

    it('should handle queue creation failure', async () => {
      // Arrange
      const queueName = 'test-queue';
      const error = new Error('Queue creation failed');
      mockQueuePort.createQueue.mockRejectedValue(error);

      // Act & Assert
      await expect(useCase.execute(queueName)).rejects.toThrow('Queue creation failed');
      expect(mockQueuePort.createQueue).toHaveBeenCalledWith(queueName);
    });

    it('should return undefined when queue port returns undefined', async () => {
      // Arrange
      const queueName = 'test-queue';
      mockQueuePort.createQueue.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(queueName);

      // Assert
      expect(result).toBeUndefined();
      expect(mockQueuePort.createQueue).toHaveBeenCalledWith(queueName);
    });

    it('should handle empty queue name', async () => {
      // Arrange
      const queueName = '';
      const expectedQueueUrl = 'http://localhost:4566/queue/';
      mockQueuePort.createQueue.mockResolvedValue(expectedQueueUrl);

      // Act
      const result = await useCase.execute(queueName);

      // Assert
      expect(mockQueuePort.createQueue).toHaveBeenCalledWith('');
      expect(result).toBe(expectedQueueUrl);
    });

    it('should handle special characters in queue name', async () => {
      // Arrange
      const queueName = 'test-queue-with-special-chars_123';
      const expectedQueueUrl = 'http://localhost:4566/queue/test-queue-with-special-chars_123';
      mockQueuePort.createQueue.mockResolvedValue(expectedQueueUrl);

      // Act
      const result = await useCase.execute(queueName);

      // Assert
      expect(mockQueuePort.createQueue).toHaveBeenCalledWith(queueName);
      expect(result).toBe(expectedQueueUrl);
    });
  });
});
