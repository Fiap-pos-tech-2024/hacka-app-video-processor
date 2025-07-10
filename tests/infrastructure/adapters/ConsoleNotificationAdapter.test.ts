import { ConsoleNotificationAdapter } from '../../../src/infrastructure/adapters/ConsoleNotificationAdapter';
import { ProcessingResult } from '../../../src/domain/entities/VideoProcessing';

describe('ConsoleNotificationAdapter', () => {
  let adapter: ConsoleNotificationAdapter;
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    };
    adapter = new ConsoleNotificationAdapter('test-bucket');
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    delete (global as any).fetch;
  });

  describe('notifySuccess', () => {
    it('should log success message with correct format', async () => {
      const result: ProcessingResult = {
        success: true,
        registerId: 'test-123',
        savedVideoKey: 'videos/test.mp4',
        originalVideoName: 'original.mp4',
        type: 'mp4',
        outputPath: '/path/to/output.zip'
      };

      await adapter.notifySuccess(result);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '✅ Processamento concluído com sucesso:',
        expect.objectContaining({
          registerId: 'test-123',
          savedVideoKey: 'videos/test.mp4',
          videoUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/videos/test.mp4',
          originalVideoName: 'original.mp4',
          type: 'mp4',
          outputPath: '/path/to/output.zip',
          user: undefined,
          savedZipKey: undefined,
          zipUrl: undefined
        })
      );
    });

    it('should call external APIs if user and zip data are present', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      mockFetch
        .mockResolvedValueOnce({ ok: true, text: async () => 'ok' } as Response)
        .mockResolvedValueOnce({ ok: true, text: async () => 'ok' } as Response);

      const result: ProcessingResult = {
        success: true,
        registerId: 'abc123',
        savedVideoKey: 'video.mp4',
        savedZipKey: 'result.zip',
        originalVideoName: 'video.mp4',
        type: 'mp4',
        user: {
          id: 'u123',
          email: 'test@example.com',
          authorization: 'Bearer xyz'
        }
      };

      await adapter.notifySuccess(result);

      // Verifica se chamada para notificação foi feita
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/notify/success'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer xyz'
          }),
          body: JSON.stringify({
            to: 'test@example.com',
            message: 'Success!',
            file: 'https://test-bucket.s3.us-east-1.amazonaws.com/result.zip'
          })
        })
      );

      // Verifica se chamada para atualização de status foi feita
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/video-upload-app/video/abc123'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            Authorization: 'Bearer xyz'
          }),
          body: JSON.stringify({
            status: 'FINISHED',
            savedZipKey: 'result.zip'
          })
        })
      );
    });
  });

  describe('notifyError', () => {
    it('should log error message', async () => {
      const context = { jobId: '123' };
      const error = new Error('fail');
      error.stack = 'trace';

      await adapter.notifyError(context, error);

      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Erro no processamento:', {
        context,
        error: 'fail',
        stack: 'trace'
      });
    });
  });

  describe('Interface Implementation', () => {
    it('should implement NotificationPort', () => {
      expect(typeof adapter.notifySuccess).toBe('function');
      expect(typeof adapter.notifyError).toBe('function');
    });
  });
});
