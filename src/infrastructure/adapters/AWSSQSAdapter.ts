import { SQSClient, CreateQueueCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { QueuePort } from '../../domain/ports/QueuePort.js';
import { VideoProcessingMessage } from '../../domain/entities/QueueMessage.js';

export class AWSSQSAdapter implements QueuePort {
  constructor(private readonly sqsClient: SQSClient) {}

  async createQueue(queueName: string): Promise<string | undefined> {
    const params = {
      QueueName: queueName,
      Attributes: {
        VisibilityTimeout: '60',
      },
    };

    try {
      const data = await this.sqsClient.send(new CreateQueueCommand(params));
      return data.QueueUrl;
    } catch (error) {
      console.error('Erro ao criar fila:', error);
      throw error;
    }
  }

  async receiveMessages(queueUrl: string): Promise<VideoProcessingMessage[]> {
    const params = {
      AttributeNames: ["All" as const],
      MaxNumberOfMessages: 10,
      MessageAttributeNames: ["All" as const],
      QueueUrl: queueUrl,
      VisibilityTimeout: 20,
      WaitTimeSeconds: 0,
    };

    try {
      const data = await this.sqsClient.send(new ReceiveMessageCommand(params));
      
      if (!data.Messages || data.Messages.length === 0) {
        return [];
      }

      return data.Messages.map(msg => 
        VideoProcessingMessage.fromQueueMessage({
          id: msg.MessageId,
          body: msg.Body || '',
          receiptHandle: msg.ReceiptHandle
        })
      );
    } catch (error) {
      console.error('Erro ao receber mensagens:', error);
      throw error;
    }
  }

  async deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    const params = {
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    };

    try {
      await this.sqsClient.send(new DeleteMessageCommand(params));
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      throw error;
    }
  }
}
