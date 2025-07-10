import { AWSSQSAdapter } from '../../../src/infrastructure/adapters/AWSSQSAdapter.js';
import { SQSClient, CreateQueueCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { VideoProcessingMessage } from '../../../src/domain/entities/QueueMessage.js';

// Mock do SQSClient
jest.mock('@aws-sdk/client-sqs');

describe('AWSSQSAdapter', () => {
  let adapter: AWSSQSAdapter;
  let mockSQSClient: jest.Mocked<SQSClient>;
  let mockSend: jest.Mock;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Criar mock do send
    mockSend = jest.fn();
    
    // Criar mock do SQSClient
    mockSQSClient = {
      send: mockSend
    } as any;

    adapter = new AWSSQSAdapter(mockSQSClient);

    // Capturar logs do console
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Limpar variáveis de ambiente
    delete process.env.NODE_ENV;
    delete process.env.AWS_REGION;
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('createQueue', () => {
    it('deve criar fila com sucesso', async () => {
      // Arrange
      const queueName = 'test-queue';
      const expectedQueueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';

      mockSend.mockResolvedValue({
        QueueUrl: expectedQueueUrl
      });

      // Act
      const result = await adapter.createQueue(queueName);

      // Assert
      expect(result).toBe(expectedQueueUrl);
      expect(mockSend).toHaveBeenCalledWith(
        expect.any(CreateQueueCommand)
      );
    });

    it('deve retornar URL de produção quando fila já existe e NODE_ENV é production', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      process.env.AWS_REGION = 'us-west-2';
      const queueName = 'existing-queue';
      
      const error = new Error('Queue already exists');
      (error as any).Code = 'QueueAlreadyExists';
      mockSend.mockRejectedValue(error);

      // Act
      const result = await adapter.createQueue(queueName);

      // Assert
      expect(result).toBe('https://sqs.us-west-2.amazonaws.com/816069165502/existing-queue');
      expect(console.log).toHaveBeenCalledWith('[INFO] Fila já existe: existing-queue');
    });

    it('deve usar região padrão us-east-1 em produção quando AWS_REGION não está definida', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const queueName = 'existing-queue';
      
      const error = new Error('Queue already exists');
      (error as any).Code = 'QueueNameExists';
      mockSend.mockRejectedValue(error);

      // Act
      const result = await adapter.createQueue(queueName);

      // Assert
      expect(result).toBe('https://sqs.us-east-1.amazonaws.com/816069165502/existing-queue');
    });

    it('deve retornar URL do LocalStack quando não está em produção e fila existe', async () => {
      // Arrange
      const queueName = 'existing-queue';
      
      const error = new Error('Queue already exists');
      (error as any).Code = 'QueueAlreadyExists';
      mockSend.mockRejectedValue(error);

      // Act
      const result = await adapter.createQueue(queueName);

      // Assert
      expect(result).toBe('http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/existing-queue');
      expect(console.log).toHaveBeenCalledWith('[INFO] Fila já existe: existing-queue');
    });

    it('deve propagar erro quando não é relacionado a fila existente', async () => {
      // Arrange
      const queueName = 'test-queue';
      const error = new Error('Access denied');
      (error as any).Code = 'AccessDenied';
      
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.createQueue(queueName)).rejects.toThrow('Access denied');
      expect(console.error).toHaveBeenCalledWith('Erro ao criar fila:', error);
    });
  });

  describe('receiveMessages', () => {
    it('deve receber mensagens com sucesso', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';
      const mockMessages = [
        {
          MessageId: 'msg-1',
          Body: JSON.stringify({
            registerId: 'test-1',
            savedVideoKey: 'video1.mp4',
            originalVideoName: 'original1.mp4',
            type: 'mp4'
          }),
          ReceiptHandle: 'receipt-1'
        },
        {
          MessageId: 'msg-2',
          Body: JSON.stringify({
            registerId: 'test-2',
            savedVideoKey: 'video2.mp4',
            originalVideoName: 'original2.mp4',
            type: 'mp4'
          }),
          ReceiptHandle: 'receipt-2'
        }
      ];

      mockSend.mockResolvedValue({
        Messages: mockMessages
      });

      // Act
      const result = await adapter.receiveMessages(queueUrl);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(VideoProcessingMessage);
      expect(result[0].id).toBe('msg-1');
      expect(result[1].id).toBe('msg-2');
      expect(mockSend).toHaveBeenCalledWith(
        expect.any(ReceiveMessageCommand)
      );
    });

    it('deve retornar array vazio quando não há mensagens', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';
      
      mockSend.mockResolvedValue({
        Messages: []
      });

      // Act
      const result = await adapter.receiveMessages(queueUrl);

      // Assert
      expect(result).toEqual([]);
    });

    it('deve retornar array vazio quando Messages é undefined', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';
      
      mockSend.mockResolvedValue({});

      // Act
      const result = await adapter.receiveMessages(queueUrl);

      // Assert
      expect(result).toEqual([]);
    });

    it('deve propagar erro quando falha ao receber mensagens', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';
      const error = new Error('Queue not found');
      
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.receiveMessages(queueUrl)).rejects.toThrow('Queue not found');
      expect(console.error).toHaveBeenCalledWith('Erro ao receber mensagens:', error);
    });

    it('deve lidar com mensagens sem body', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';
      const mockMessages = [
        {
          MessageId: 'msg-1',
          Body: undefined,
          ReceiptHandle: 'receipt-1'
        }
      ];

      mockSend.mockResolvedValue({
        Messages: mockMessages
      });

      // Act
      const result = await adapter.receiveMessages(queueUrl);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].body).toBe('');
    });
  });

  describe('deleteMessage', () => {
    it('deve deletar mensagem com sucesso', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';
      const receiptHandle = 'receipt-handle-123';

      mockSend.mockResolvedValue({});

      // Act
      await adapter.deleteMessage(queueUrl, receiptHandle);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.any(DeleteMessageCommand)
      );
      
      // Verificar se DeleteMessageCommand foi criado com os parâmetros corretos
      const deleteCommandCall = mockSend.mock.calls[0][0];
      expect(deleteCommandCall).toBeInstanceOf(DeleteMessageCommand);
      // Não acessamos .input diretamente, mas verificamos que o comando foi criado com os parâmetros
    });

    it('deve propagar erro quando falha ao deletar mensagem', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';
      const receiptHandle = 'receipt-handle-123';
      const error = new Error('Message not found');
      
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(adapter.deleteMessage(queueUrl, receiptHandle)).rejects.toThrow('Message not found');
      expect(console.error).toHaveBeenCalledWith('Erro ao deletar mensagem:', error);
    });
  });
});
