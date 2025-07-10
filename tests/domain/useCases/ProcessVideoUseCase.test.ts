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

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const queueUrl = 'http://test-queue-url';

    it('should process no messages when queue is empty', async () => {
      // Arrange
      mocks.queuePort.receiveMessages.mockResolvedValue([]);

      // Act
      await useCase.execute(queueUrl);

      // Assert
      expect(mocks.queuePort.receiveMessages).toHaveBeenCalledWith(queueUrl);
      expect(mocks.queuePort.receiveMessages).toHaveBeenCalledTimes(1);
      expect(mocks.queuePort.deleteMessage).not.toHaveBeenCalled();
    });

    it('should process single message successfully', async () => {
      // Arrange
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

      // Act
      await useCase.execute(queueUrl);

      // Assert
      expect(mocks.queuePort.receiveMessages).toHaveBeenCalledWith(queueUrl);
      expect(mocks.storagePort.downloadFile).toHaveBeenCalledWith('fiap-video-bucket-20250706', 'test-video.mp4');
      expect(mocks.notificationPort.notifySuccess).toHaveBeenCalled();
      expect(mocks.queuePort.deleteMessage).toHaveBeenCalledWith(queueUrl, 'receipt-handle-123');
    });

    it('should handle multiple messages', async () => {
      // Arrange
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

      // Act
      await useCase.execute(queueUrl);

      // Assert
      expect(mocks.storagePort.downloadFile).toHaveBeenCalledTimes(2);
      expect(mocks.queuePort.deleteMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle queue receive error', async () => {
      // Arrange
      const error = new Error('Queue connection failed');
      mocks.queuePort.receiveMessages.mockRejectedValue(error);

      // Act
      await useCase.execute(queueUrl);

      // Assert
      expect(mocks.notificationPort.notifyError).toHaveBeenCalledWith(
        { queueUrl },
        error
      );
    });
  });

  describe('processMessage', () => {
    it('should handle invalid JSON in message body', async () => {
      // Arrange
      const queueUrl = 'http://test-queue-url';
      const invalidMessage = new VideoProcessingMessage(
        'msg-invalid',
        'invalid json {',
        'handle-invalid'
      );

      mocks.queuePort.receiveMessages.mockResolvedValue([invalidMessage]);

      // Act
      await useCase.execute(queueUrl);

      // Assert
      expect(mocks.notificationPort.notifyError).toHaveBeenCalled();
      expect(mocks.queuePort.deleteMessage).toHaveBeenCalledWith(queueUrl, 'handle-invalid');
    });

    it('should handle video processing failure', async () => {
      // Arrange
      const queueUrl = 'http://test-queue-url';
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
      mocks.storagePort.downloadFile.mockResolvedValue(null); // File not found

      // Act
      await useCase.execute(queueUrl);

      // Assert
      expect(mocks.notificationPort.notifyError).toHaveBeenCalled();
      expect(mocks.queuePort.deleteMessage).toHaveBeenCalledWith(queueUrl, 'receipt-handle-123');
    });

    it('should handle FFmpeg processing failure', async () => {
      // Arrange
      const queueUrl = 'http://test-queue-url';
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
      mocks.videoProcessorPort.extractFrames.mockResolvedValue([]); // No frames extracted

      mocks.fileSystemPort.mkdir.mockResolvedValue(undefined);
      mocks.fileSystemPort.writeFile.mockResolvedValue(undefined);
      mocks.fileSystemPort.ensureDir.mockResolvedValue(undefined);

      // Act
      await useCase.execute(queueUrl);

      // Assert
      expect(mocks.notificationPort.notifyError).toHaveBeenCalled();
      expect(mocks.queuePort.deleteMessage).toHaveBeenCalledWith(queueUrl, 'receipt-handle-123');
    });
  });

  describe('Video Processing Flow', () => {
    it('should complete full video processing workflow', async () => {
      // Arrange
      const queueUrl = 'http://test-queue-url';
      const mockMessage = new VideoProcessingMessage(
        'msg-123',
        JSON.stringify({
          registerId: 'test-register-123',
          savedVideoKey: 'videos/test-video.mp4',
          originalVideoName: 'my-video.mp4',
          type: 'mp4'
        }),
        'receipt-handle-123'
      );

      mocks.queuePort.receiveMessages.mockResolvedValue([mockMessage]);
      mocks.storagePort.downloadFile.mockResolvedValue(Buffer.from('fake video content'));
      mocks.videoProcessorPort.extractFrames.mockResolvedValue([
        'frame_0001.png',
        'frame_0002.png',
        'frame_0003.png'
      ]);
      mocks.fileSystemPort.mkdir.mockResolvedValue(undefined);
      mocks.fileSystemPort.writeFile.mockResolvedValue(undefined);
      mocks.fileSystemPort.ensureDir.mockResolvedValue(undefined);
      mocks.fileSystemPort.remove.mockResolvedValue(undefined);
      mocks.videoProcessorPort.createZipFromFrames.mockResolvedValue(undefined);

      // Act
      await useCase.execute(queueUrl);

      // Assert - Verify workflow steps
      expect(mocks.storagePort.downloadFile).toHaveBeenCalledWith('fiap-video-bucket-20250706', 'videos/test-video.mp4');
      expect(mocks.fileSystemPort.writeFile).toHaveBeenCalled();
      expect(mocks.videoProcessorPort.extractFrames).toHaveBeenCalled();
      expect(mocks.videoProcessorPort.createZipFromFrames).toHaveBeenCalled();
      expect(mocks.fileSystemPort.remove).toHaveBeenCalledTimes(2); // temp dir and video file
      expect(mocks.notificationPort.notifySuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          registerId: 'test-register-123',
          savedVideoKey: 'videos/test-video.mp4',
          originalVideoName: 'my-video.mp4',
          type: 'mp4'
        })
      );
      expect(mocks.queuePort.deleteMessage).toHaveBeenCalledWith(queueUrl, 'receipt-handle-123');
    });
  });
});
