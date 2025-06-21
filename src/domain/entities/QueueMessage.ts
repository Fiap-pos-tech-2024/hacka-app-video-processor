export interface QueueMessage {
  id?: string;
  body: string;
  receiptHandle?: string;
}

export class VideoProcessingMessage {
  constructor(
    public readonly id: string | undefined,
    public readonly body: string,
    public readonly receiptHandle: string | undefined
  ) {}

  static fromQueueMessage(message: QueueMessage): VideoProcessingMessage {
    return new VideoProcessingMessage(
      message.id,
      message.body,
      message.receiptHandle
    );
  }

  parseBody(): any {
    try {
      return JSON.parse(this.body);
    } catch (error) {
      throw new Error(`Invalid JSON in message body: ${error}`);
    }
  }
}
