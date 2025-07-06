import { ConsoleNotificationAdapter } from '../../../src/infrastructure/adapters/ConsoleNotificationAdapter';
import { ProcessingResult } from '../../../src/domain/entities/VideoProcessing';

describe('ConsoleNotificationAdapter', () => {
  let adapter: ConsoleNotificationAdapter;
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    // Create fresh spies for each test
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    };
    
    adapter = new ConsoleNotificationAdapter({
      endpoint: 'http://localhost:4566',
      bucket: 'test-bucket'
    });
  });

  afterEach(() => {
    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('notifySuccess', () => {
    it('should log success message with correct format', async () => {
      // Arrange
      const result: ProcessingResult = {
        success: true,
        registerId: 'test-123',
        savedVideoKey: 'videos/test.mp4',
        originalVideoName: 'original.mp4',
        type: 'mp4',
        outputPath: '/path/to/output.zip'
      };

      // Act
      await adapter.notifySuccess(result);

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '✅ Processamento concluído com sucesso:',
        {
          registerId: 'test-123',
          savedVideoKey: 'videos/test.mp4',
          videoUrl: 'http://localhost:4566/test-bucket/videos/test.mp4',
          originalVideoName: 'original.mp4',
          type: 'mp4',
          outputPath: '/path/to/output.zip',
          savedZipKey: undefined,
          zipUrl: undefined
        }
      );
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });

    it('should handle result without outputPath', async () => {
      // Arrange
      const result: ProcessingResult = {
        success: true,
        registerId: 'test-456',
        savedVideoKey: 'videos/test2.mp4',
        originalVideoName: 'original2.mp4',
        type: 'mp4'
      };

      // Act
      await adapter.notifySuccess(result);

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '✅ Processamento concluído com sucesso:',
        {
          registerId: 'test-456',
          savedVideoKey: 'videos/test2.mp4',
          videoUrl: 'http://localhost:4566/test-bucket/videos/test2.mp4',
          originalVideoName: 'original2.mp4',
          type: 'mp4',
          outputPath: undefined,
          savedZipKey: undefined,
          zipUrl: undefined
        }
      );
    });

    it('should handle minimal result data', async () => {
      // Arrange
      const result: ProcessingResult = {
        success: false, // Even if success is false, notifySuccess should log
        registerId: 'min-123',
        savedVideoKey: 'min.mp4',
        originalVideoName: 'min.mp4',
        type: 'mp4'
      };

      // Act
      await adapter.notifySuccess(result);

      // Assert
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('notifyError', () => {
    it('should log error message with context and error details', async () => {
      // Arrange
      const context = {
        registerId: 'error-test-123',
        savedVideoKey: 'error-video.mp4'
      };
      const error = new Error('Processing failed');
      error.stack = 'Error stack trace...';

      // Act
      await adapter.notifyError(context, error);

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '❌ Erro no processamento:',
        {
          context,
          error: 'Processing failed',
          stack: 'Error stack trace...'
        }
      );
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('should handle string errors', async () => {
      // Arrange
      const context = { test: 'context' };
      const errorString = 'Simple error string';

      // Act
      await adapter.notifyError(context, errorString);

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '❌ Erro no processamento:',
        {
          context,
          error: 'Simple error string',
          stack: undefined
        }
      );
    });

    it('should handle errors without message', async () => {
      // Arrange
      const context = { queueUrl: 'http://test' };
      const error = { someProperty: 'value' }; // Object without message property

      // Act
      await adapter.notifyError(context, error);

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '❌ Erro no processamento:',
        {
          context,
          error: { someProperty: 'value' },
          stack: undefined
        }
      );
    });

    it('should handle null/undefined context', async () => {
      // Arrange
      const error = new Error('Test error');

      // Act
      await adapter.notifyError(null, error);
      await adapter.notifyError(undefined, error);

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledTimes(2);
      expect(consoleSpy.error).toHaveBeenNthCalledWith(1, '❌ Erro no processamento:', {
        context: null,
        error: 'Test error',
        stack: expect.any(String)
      });
      expect(consoleSpy.error).toHaveBeenNthCalledWith(2, '❌ Erro no processamento:', {
        context: undefined,
        error: 'Test error',
        stack: expect.any(String)
      });
    });

    it('should handle empty context object', async () => {
      // Arrange
      const context = {};
      const error = new Error('Empty context test');

      // Act
      await adapter.notifyError(context, error);

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '❌ Erro no processamento:',
        {
          context: {},
          error: 'Empty context test',
          stack: expect.any(String)
        }
      );
    });
  });

  describe('Implementation', () => {
    it('should implement NotificationPort interface', () => {
      expect(adapter.notifySuccess).toBeDefined();
      expect(adapter.notifyError).toBeDefined();
      expect(typeof adapter.notifySuccess).toBe('function');
      expect(typeof adapter.notifyError).toBe('function');
    });

    it('should return promises from methods', () => {
      const result: ProcessingResult = {
        success: true,
        registerId: 'test',
        savedVideoKey: 'test.mp4',
        originalVideoName: 'test.mp4',
        type: 'mp4'
      };

      expect(adapter.notifySuccess(result)).toBeInstanceOf(Promise);
      expect(adapter.notifyError({}, new Error())).toBeInstanceOf(Promise);
    });
  });
});
