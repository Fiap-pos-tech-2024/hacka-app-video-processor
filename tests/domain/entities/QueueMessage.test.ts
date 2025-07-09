import { QueueMessage, VideoProcessingMessage } from '../../../src/domain/entities/QueueMessage.js';

describe('QueueMessage Entities', () => {
  describe('VideoProcessingMessage', () => {
    const mockMessage: QueueMessage = {
      id: 'msg-123',
      body: '{"registerId":"test-123","savedVideoKey":"test.mp4","originalVideoName":"original.mp4","type":"mp4"}',
      receiptHandle: 'handle-123'
    };

    describe('Constructor', () => {
      it('should create VideoProcessingMessage with all properties', () => {
        const message = new VideoProcessingMessage(
          mockMessage.id,
          mockMessage.body,
          mockMessage.receiptHandle
        );

        expect(message.id).toBe(mockMessage.id);
        expect(message.body).toBe(mockMessage.body);
        expect(message.receiptHandle).toBe(mockMessage.receiptHandle);
      });

      it('should handle undefined properties', () => {
        const message = new VideoProcessingMessage(
          undefined,
          'test body',
          undefined
        );

        expect(message.id).toBeUndefined();
        expect(message.body).toBe('test body');
        expect(message.receiptHandle).toBeUndefined();
      });
    });

    describe('fromQueueMessage', () => {
      it('should create VideoProcessingMessage from QueueMessage', () => {
        const message = VideoProcessingMessage.fromQueueMessage(mockMessage);

        expect(message).toBeInstanceOf(VideoProcessingMessage);
        expect(message.id).toBe(mockMessage.id);
        expect(message.body).toBe(mockMessage.body);
        expect(message.receiptHandle).toBe(mockMessage.receiptHandle);
      });

      it('should handle minimal QueueMessage', () => {
        const minimalMessage: QueueMessage = {
          body: 'test body'
        };

        const message = VideoProcessingMessage.fromQueueMessage(minimalMessage);

        expect(message.id).toBeUndefined();
        expect(message.body).toBe('test body');
        expect(message.receiptHandle).toBeUndefined();
      });
    });

    describe('parseBody', () => {
      it('should parse valid JSON body', () => {
        const jsonBody = '{"registerId":"test-123","type":"mp4"}';
        const message = new VideoProcessingMessage('id', jsonBody, 'handle');

        const parsed = message.parseBody();

        expect(parsed).toEqual({
          registerId: 'test-123',
          type: 'mp4'
        });
      });

      it('should parse complex JSON body', () => {
        const complexBody = JSON.stringify({
          registerId: 'test-456',
          savedVideoKey: 'videos/test.mp4',
          originalVideoName: 'original.mp4',
          type: 'mp4',
          metadata: {
            uploadDate: '2025-01-01',
            size: 1024
          }
        });
        
        const message = new VideoProcessingMessage('id', complexBody, 'handle');
        const parsed = message.parseBody();

        expect(parsed.registerId).toBe('test-456');
        expect(parsed.metadata.size).toBe(1024);
      });

      it('should throw error for invalid JSON', () => {
        const invalidBody = 'invalid json {';
        const message = new VideoProcessingMessage('id', invalidBody, 'handle');

        expect(() => message.parseBody()).toThrow('Invalid JSON in message body');
      });

      it('should throw error for empty string', () => {
        const message = new VideoProcessingMessage('id', '', 'handle');

        expect(() => message.parseBody()).toThrow('Invalid JSON in message body');
      });      it('should handle null values in JSON', () => {
        const jsonBody = '{"registerId":null,"type":"mp4","optional":null}';
        const message = new VideoProcessingMessage('id', jsonBody, 'handle');

        const parsed = message.parseBody();

        expect(parsed.registerId).toBeNull();
        expect(parsed.type).toBe('mp4');
        expect(parsed.optional).toBeNull();
      });
    });
  });
});
