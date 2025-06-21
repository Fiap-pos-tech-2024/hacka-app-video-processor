import { QueuePort } from '../ports/QueuePort.js';

export class CreateQueueUseCase {
  constructor(private readonly queuePort: QueuePort) {}

  async execute(queueName: string): Promise<string | undefined> {
    try {
      const queueUrl = await this.queuePort.createQueue(queueName);
      if (queueUrl) {
        console.log('Fila criada com sucesso:', queueUrl);
      }
      return queueUrl;
    } catch (error) {
      console.error('Erro ao criar fila:', error);
      throw error;
    }
  }
}
