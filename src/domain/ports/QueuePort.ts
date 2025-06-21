import { VideoProcessingMessage } from '../entities/QueueMessage.js';

export interface QueuePort {
  createQueue(queueName: string): Promise<string | undefined>;
  receiveMessages(queueUrl: string): Promise<VideoProcessingMessage[]>;
  deleteMessage(queueUrl: string, receiptHandle: string): Promise<void>;
}
