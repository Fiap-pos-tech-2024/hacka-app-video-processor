import { ConsoleNotificationAdapter } from '../../../src/infrastructure/adapters/ConsoleNotificationAdapter';
import { ProcessingResult } from '../../../src/domain/entities/VideoProcessing';

describe('ConsoleNotificationAdapter', () => {
  let adapter: ConsoleNotificationAdapter;
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
  };
  let mockFetch: jest.Mock;

  beforeEach(() => {
    process.env.BASE_PATH_EXTERNAL_API = 'http://localhost:3001';
    mockFetch = jest.fn();

    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => { }),
      error: jest.spyOn(console, 'error').mockImplementation(() => { }),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => { }),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
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
    adapter = new ConsoleNotificationAdapter('test-bucket', mockFetch);

    mockFetch
      .mockResolvedValueOnce({ ok: true, text: async () => 'ok' }) // notify
      .mockResolvedValueOnce({ ok: true, text: async () => 'ok' }); // update

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

  it('should skip update status if required fields are missing', async () => {
    adapter = new ConsoleNotificationAdapter('test-bucket', mockFetch);

    // Missing registerId
    await adapter['updateVideoStatus'](
      {
        user: { id: 'u1', email: 'x', authorization: 'token' },
        savedZipKey: 'zip',
      } as any,
      'zip'
    );

    // Missing savedZipKey
    await adapter['updateVideoStatus'](
      {
        registerId: 'r1',
        user: { id: 'u1', email: 'x', authorization: 'token' },
      } as any,
      undefined
    );

    // Missing user
    await adapter['updateVideoStatus'](
      {
        registerId: 'r1',
        savedZipKey: 'zip',
      } as any,
      'zip'
    );

    // Missing user.authorization
    await adapter['updateVideoStatus'](
      {
        registerId: 'r1',
        savedZipKey: 'zip',
        user: { id: 'u1', email: 'x' },
      } as any,
      'zip'
    );

    expect(consoleSpy.warn).toHaveBeenCalledTimes(4);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should skip sending external notification if user data is missing', async () => {
    adapter = new ConsoleNotificationAdapter('test-bucket', mockFetch);

    const result: ProcessingResult = {
      success: true,
      registerId: 'abc123',
      savedVideoKey: 'video.mp4',
      savedZipKey: 'result.zip',
      originalVideoName: 'video.mp4',
      type: 'mp4',
      // user is missing
    };

    await expect(adapter.notifySuccess(result)).resolves.not.toThrow();

    const warnMessages = consoleSpy.warn.mock.calls.flat();

    expect(
      warnMessages.some(msg =>
        msg.includes('autorização do usuário não encontrada') ||
        msg.includes('Email ou autorização do usuário não encontrados')
      )
    ).toBe(true);


    expect(mockFetch).not.toHaveBeenCalled();
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
