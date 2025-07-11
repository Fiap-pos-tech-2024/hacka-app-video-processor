import { ProcessVideoUseCase } from '../../../src/domain/useCases/ProcessVideoUseCase';
import { VideoProcessingMessage } from '../../../src/domain/entities/QueueMessage';
import { createMockPorts } from '../../mocks/ports';

// Mock do uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

describe('ProcessVideoUseCase', () => {
  let useCase: ProcessVideoUseCase;
  let mocks: ReturnType<typeof createMockPorts>;

  beforeEach(() => {
    mocks = createMockPorts();
    useCase = new ProcessVideoUseCase(
      mocks.queuePort,
      mocks.storagePort,
      mocks.fileSystemPort,
      mocks.videoProcessorPort,
      mocks.notificationPort,
      'fiap-video-bucket-20250706'
    );

    jest.clearAllMocks();
  });

  describe('execute', () => {
    const queueUrl = 'http://test-queue-url';

    it('should process no messages when queue is empty', async () => {
      mocks.queuePort.receiveMessages.mockResolvedValue([]);

      await useCase.execute(queueUrl);

      expect(mocks.queuePort.receiveMessages).toHaveBeenCalledWith(queueUrl);
      expect(mocks.queuePort.deleteMessage).not.toHaveBeenCalled();
    });

    it('should process single message successfully', async () => {
      const mockMessage = new VideoProcessingMessage(
        'msg-123',
        JSON.stringify({
          registerId: 'test-123',
          savedVideoKey: 'test-video.mp4',
          originalVideoName: 'original.mp4',
          type: 'mp4'
        }),
        'receipt-handle-123'
      );

      mocks.queuePort.receiveMessages.mockResolvedValue([mockMessage]);
      mocks.storagePort.downloadFile.mockResolvedValue(Buffer.from('fake video data'));
      mocks.videoProcessorPort.extractFrames.mockResolvedValue(['frame1.png', 'frame2.png']);
      mocks.fileSystemPort.mkdir.mockResolvedValue(undefined);
      mocks.fileSystemPort.writeFile.mockResolvedValue(undefined);
      mocks.fileSystemPort.ensureDir.mockResolvedValue(undefined);
      mocks.fileSystemPort.remove.mockResolvedValue(undefined);
      mocks.videoProcessorPort.createZipFromFrames.mockResolvedValue(undefined);
      mocks.videoProcessorPort.createZipFromFrames.mockResolvedValue('frames_test-uuid-123.zip');

      await useCase.execute(queueUrl);

      expect(mocks.notificationPort.notifySuccess).toHaveBeenCalled();
      expect(mocks.queuePort.deleteMessage).toHaveBeenCalledWith(queueUrl, 'receipt-handle-123');
    });

    it('should handle multiple messages', async () => {
      const mockMessages = [
        new VideoProcessingMessage('msg-1', JSON.stringify({
          registerId: 'test-1',
          savedVideoKey: 'video1.mp4',
          originalVideoName: 'original1.mp4',
          type: 'mp4'
        }), 'handle-1'),
        new VideoProcessingMessage('msg-2', JSON.stringify({
          registerId: 'test-2',
          savedVideoKey: 'video2.mp4',
          originalVideoName: 'original2.mp4',
          type: 'mp4'
        }), 'handle-2')
      ];

      mocks.queuePort.receiveMessages.mockResolvedValue(mockMessages);
      mocks.storagePort.downloadFile.mockResolvedValue(Buffer.from('fake video data'));
      mocks.videoProcessorPort.extractFrames.mockResolvedValue(['frame1.png']);
      mocks.fileSystemPort.mkdir.mockResolvedValue(undefined);
      mocks.fileSystemPort.writeFile.mockResolvedValue(undefined);
      mocks.fileSystemPort.ensureDir.mockResolvedValue(undefined);
      mocks.fileSystemPort.remove.mockResolvedValue(undefined);
      mocks.videoProcessorPort.createZipFromFrames.mockResolvedValue(undefined);
      mocks.videoProcessorPort.createZipFromFrames.mockResolvedValue('frames_test-uuid-123.zip');

      await useCase.execute(queueUrl);

      expect(mocks.queuePort.deleteMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle queue receive error', async () => {
      const error = new Error('Queue connection failed');
      mocks.queuePort.receiveMessages.mockRejectedValue(error);

      await useCase.execute(queueUrl);

      expect(mocks.notificationPort.notifyError).toHaveBeenCalledWith(
        { queueUrl },
        error
      );
    });
  });

  describe('processMessage', () => {
    it('should handle invalid JSON in message body', async () => {
      const queueUrl = 'http://test-queue-url';
      const invalidMessage = new VideoProcessingMessage('msg-invalid', 'invalid json {', 'handle-invalid');

      mocks.queuePort.receiveMessages.mockResolvedValue([invalidMessage]);

      await useCase.execute(queueUrl);

      expect(mocks.notificationPort.notifyError).toHaveBeenCalled();
      expect(mocks.queuePort.deleteMessage).toHaveBeenCalledWith(queueUrl, 'handle-invalid');
    });

    it('should handle video processing failure (file not found)', async () => {
      const queueUrl = 'http://test-queue-url';
      const mockMessage = new VideoProcessingMessage('msg-123', JSON.stringify({
        registerId: 'test-123',
        savedVideoKey: 'test-video.mp4',
        originalVideoName: 'original.mp4',
        type: 'mp4'
      }), 'receipt-handle-123');

      mocks.queuePort.receiveMessages.mockResolvedValue([mockMessage]);
      mocks.storagePort.downloadFile.mockResolvedValue(null);

      await useCase.execute(queueUrl);

      expect(mocks.notificationPort.notifyError).toHaveBeenCalled();
      expect(mocks.queuePort.deleteMessage).toHaveBeenCalledWith(queueUrl, 'receipt-handle-123');
    });

    it('should handle FFmpeg processing failure (no frames)', async () => {
      const queueUrl = 'http://test-queue-url';
      const mockMessage = new VideoProcessingMessage('msg-123', JSON.stringify({
        registerId: 'test-123',
        savedVideoKey: 'test-video.mp4',
        originalVideoName: 'original.mp4',
        type: 'mp4'
      }), 'receipt-handle-123');

      mocks.queuePort.receiveMessages.mockResolvedValue([mockMessage]);
      mocks.storagePort.downloadFile.mockResolvedValue(Buffer.from('fake video data'));
      mocks.videoProcessorPort.extractFrames.mockResolvedValue([]);
      mocks.fileSystemPort.writeFile.mockResolvedValue(undefined);
      mocks.fileSystemPort.ensureDir.mockResolvedValue(undefined);
      mocks.fileSystemPort.remove.mockResolvedValue(undefined);

      await useCase.execute(queueUrl);

      expect(mocks.notificationPort.notifyError).toHaveBeenCalled();
      expect(mocks.queuePort.deleteMessage).toHaveBeenCalledWith(queueUrl, 'receipt-handle-123');
    });
  });

  describe('Video Processing Flow', () => {
    it('should complete full video processing workflow', async () => {
      const queueUrl = 'http://test-queue-url';
      const mockMessage = new VideoProcessingMessage('msg-123', JSON.stringify({
        registerId: 'test-register-123',
        savedVideoKey: 'videos/test-video.mp4',
        originalVideoName: 'my-video.mp4',
        type: 'mp4'
      }), 'receipt-handle-123');

      mocks.queuePort.receiveMessages.mockResolvedValue([mockMessage]);
      mocks.storagePort.downloadFile.mockResolvedValue(Buffer.from('fake video content'));
      mocks.videoProcessorPort.extractFrames.mockResolvedValue(['frame_0001.png', 'frame_0002.png']);
      mocks.fileSystemPort.mkdir.mockResolvedValue(undefined);
      mocks.fileSystemPort.writeFile.mockResolvedValue(undefined);
      mocks.fileSystemPort.ensureDir.mockResolvedValue(undefined);
      mocks.fileSystemPort.remove.mockResolvedValue(undefined);
      mocks.videoProcessorPort.createZipFromFrames.mockResolvedValue(undefined);
      mocks.videoProcessorPort.createZipFromFrames.mockResolvedValue('frames_test-uuid-123.zip');

      await useCase.execute(queueUrl);

      expect(mocks.videoProcessorPort.createZipFromFrames).toHaveBeenCalled();
      expect(mocks.notificationPort.notifySuccess).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        registerId: 'test-register-123',
        savedVideoKey: 'videos/test-video.mp4',
        originalVideoName: 'my-video.mp4',
        type: 'mp4',
        savedZipKey: 'frames_test-uuid-123.zip'
      }));
      expect(mocks.queuePort.deleteMessage).toHaveBeenCalledWith(queueUrl, 'receipt-handle-123');
    });
  });
});
