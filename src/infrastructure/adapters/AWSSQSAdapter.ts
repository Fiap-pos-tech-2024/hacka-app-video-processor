import { SQSClient, CreateQueueCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { QueuePort } from '../../domain/ports/QueuePort.js';
import { VideoProcessingMessage } from '../../domain/entities/QueueMessage.js';

export class AWSSQSAdapter implements QueuePort {
  constructor(private readonly sqsClient: SQSClient) { }

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
    } catch (error: any) {
      if (error.Code === 'QueueNameExists' || error.Code === 'QueueAlreadyExists') {
        console.log(`[INFO] Fila já existe: ${queueName}`);

        // Usar GetQueueUrl para obter a URL correta
        if (process.env.NODE_ENV === 'production') {
          // Em produção, usar a URL conhecida da fila
          const region = process.env.AWS_REGION || 'us-east-1';
          const accountId = '816069165502'; // Account ID extraído da URL fornecida
          const queueUrl = `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;
          return queueUrl;
        } else {
          // Para LocalStack
          const queueUrl = `http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/${queueName}`;
          return queueUrl;
        }
      }
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
      VisibilityTimeout: 30,
      WaitTimeSeconds: 20, // 👈 long polling habilitado!
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
