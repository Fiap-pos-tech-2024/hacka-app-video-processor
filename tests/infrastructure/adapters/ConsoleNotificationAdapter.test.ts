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
    
    adapter = new ConsoleNotificationAdapter('test-bucket');
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
          videoUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/videos/test.mp4',
          originalVideoName: 'original.mp4',
          type: 'mp4',
          user: undefined,
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
          videoUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/videos/test2.mp4',
          originalVideoName: 'original2.mp4',
          type: 'mp4',
          user: undefined,
          outputPath: undefined,
          savedZipKey: undefined,
          zipUrl: undefined
        }
      );
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
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

    it('should call private sendSuccessNotification and updateVideoStatus with valid data', async () => {
      // Arrange
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      // Mock successful responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'Notification sent'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'Status updated'
        } as Response);

      const result: ProcessingResult = {
        success: true,
        registerId: 'test-123',
        savedVideoKey: 'videos/test.mp4',
        originalVideoName: 'original.mp4',
        type: 'mp4',
        savedZipKey: 'frames_123.zip',
        user: {
          id: 'user-123',
          email: 'user@test.com',
          authorization: 'Bearer token123'
        }
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await adapter.notifySuccess(result);

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Verify notification call
      expect(mockFetch).toHaveBeenCalledWith(
        'http://ms-shared-alb-1798493639.us-east-1.elb.amazonaws.com/api/notify/success',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'accept': '*/*',
            'Authorization': 'Bearer token123',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: 'user@test.com',
            message: 'Success!',
            file: 'https://test-bucket.s3.us-east-1.amazonaws.com/frames_123.zip'
          })
        })
      );

      // Verify status update call
      expect(mockFetch).toHaveBeenCalledWith(
        'http://ms-shared-alb-1798493639.us-east-1.elb.amazonaws.com/video-upload-app/video/test-123',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'accept': 'application/json',
            'Authorization': 'Bearer token123',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'FINISHED',
            savedZipKey: 'frames_123.zip'
          })
        })
      );

      expect(logSpy).toHaveBeenCalledWith('✅ Notificação enviada com sucesso para API externa');
      expect(logSpy).toHaveBeenCalledWith('✅ Status atualizado com sucesso na API do microserviço');

      consoleSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('should skip external notification when zipUrl is missing', async () => {
      // Arrange
      const result: ProcessingResult = {
        success: true,
        registerId: 'test-123',
        savedVideoKey: 'videos/test.mp4',
        originalVideoName: 'original.mp4',
        type: 'mp4',
        user: {
          id: 'user-123',
          email: 'user@test.com',
          authorization: 'Bearer token123'
        }
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      await adapter.notifySuccess(result);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('URL do ZIP não encontrada, pulando notificação externa');
      consoleSpy.mockRestore();
    });

    it('should skip status update when registerId is missing', async () => {
      // Arrange
      const result: any = { // Using any to allow missing registerId
        success: true,
        savedVideoKey: 'videos/test.mp4',
        originalVideoName: 'original.mp4',
        type: 'mp4',
        savedZipKey: 'frames_123.zip',
        user: {
          id: 'user-123',
          email: 'user@test.com',
          authorization: 'Bearer token123'
        }
        // registerId is missing
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      await adapter.notifySuccess(result);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('RegisterId não encontrado, pulando atualização de status');
      consoleSpy.mockRestore();
    });

    it('should skip status update when savedZipKey is missing', async () => {
      // Arrange
      const result: ProcessingResult = {
        success: true,
        registerId: 'test-123',
        savedVideoKey: 'videos/test.mp4',
        originalVideoName: 'original.mp4',
        type: 'mp4',
        user: {
          id: 'user-123',
          email: 'user@test.com',
          authorization: 'Bearer token123'
        }
        // savedZipKey is missing
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      await adapter.notifySuccess(result);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('SavedZipKey não encontrado, pulando atualização de status');
      consoleSpy.mockRestore();
    });

    it('should handle notification API errors', async () => {
      // Arrange
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      } as Response);

      const result: ProcessingResult = {
        success: true,
        registerId: 'test-123',
        savedVideoKey: 'videos/test.mp4',
        originalVideoName: 'original.mp4',
        type: 'mp4',
        savedZipKey: 'frames_123.zip',
        user: {
          id: 'user-123',
          email: 'user@test.com',
          authorization: 'Bearer token123'
        }
      };

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await adapter.notifySuccess(result);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        'Erro ao enviar notificação para API externa:',
        expect.any(Error)
      );
      errorSpy.mockRestore();
    });

    it('should handle status update API errors', async () => {
      // Arrange
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      // Mock successful notification but failed status update
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => 'Notification sent'
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error'
        } as Response);

      const result: ProcessingResult = {
        success: true,
        registerId: 'test-123',
        savedVideoKey: 'videos/test.mp4',
        originalVideoName: 'original.mp4',
        type: 'mp4',
        savedZipKey: 'frames_123.zip',
        user: {
          id: 'user-123',
          email: 'user@test.com',
          authorization: 'Bearer token123'
        }
      };

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await adapter.notifySuccess(result);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith(
        'Erro ao atualizar status na API do microserviço:',
        expect.any(Error)
      );
      errorSpy.mockRestore();
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
