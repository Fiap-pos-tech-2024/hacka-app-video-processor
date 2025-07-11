import { ConsoleNotificationAdapter } from '../../../src/infrastructure/adapters/ConsoleNotificationAdapter';
import { ProcessingResult } from '../../../src/domain/entities/VideoProcessing';

describe('ConsoleNotificationAdapter', () => {
  let adapter: ConsoleNotificationAdapter;
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    process.env.BASE_PATH_EXTERNAL_API = 'http://localhost:3001';

    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    delete process.env.BASE_PATH_EXTERNAL_API;
  });

  it('should log success message with correct format', async () => {
    adapter = new ConsoleNotificationAdapter('test-bucket');
    const result: ProcessingResult = {
      success: true,
      registerId: 'test-123',
      savedVideoKey: 'videos/test.mp4',
      originalVideoName: 'original.mp4',
      type: 'mp4',
      outputPath: '/path/to/output.zip',
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
      })
    );
  });

  it('should call external APIs if user and zip data are present', async () => {
    const mockFetch = jest.fn();

    // ✅ Mocka os retornos com .ok e .text()
    mockFetch
      .mockResolvedValueOnce({ ok: true, text: async () => 'ok' }) // notificação
      .mockResolvedValueOnce({ ok: true, text: async () => 'ok' }); // status update

    adapter = new ConsoleNotificationAdapter('test-bucket', mockFetch);

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
        authorization: 'Bearer xyz',
      },
    };

    await adapter.notifySuccess(result);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/notify/success',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer xyz',
        }),
        body: JSON.stringify({
          to: 'test@example.com',
          message: 'Success!',
          file: 'https://test-bucket.s3.us-east-1.amazonaws.com/result.zip',
        }),
      })
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/video/abc123',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Authorization: 'Bearer xyz',
        }),
        body: JSON.stringify({
          status: 'FINISHED',
          savedZipKey: 'result.zip',
        }),
      })
    );
  });

  it('should log error message', async () => {
    adapter = new ConsoleNotificationAdapter('test-bucket');
    const context = { jobId: '123' };
    const error = new Error('fail');
    error.stack = 'trace';

    await adapter.notifyError(context, error);

    expect(consoleSpy.error).toHaveBeenCalledWith('❌ Erro no processamento:', {
      context,
      error: 'fail',
      stack: 'trace',
    });
  });

  it('should implement NotificationPort', () => {
    adapter = new ConsoleNotificationAdapter('test-bucket');
    expect(typeof adapter.notifySuccess).toBe('function');
    expect(typeof adapter.notifyError).toBe('function');
  });
});
