import { QueuePort } from '../ports/QueuePort.js';
import { StoragePort } from '../ports/StoragePort.js';
import { FileSystemPort } from '../ports/FileSystemPort.js';
import { VideoProcessorPort } from '../ports/VideoProcessorPort.js';
import { NotificationPort } from '../ports/NotificationPort.js';
import { VideoProcessing, ProcessingResult } from '../entities/VideoProcessing.js';
import { VideoProcessingMessage } from '../entities/QueueMessage.js';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class ProcessVideoUseCase {
  constructor(
    private readonly queuePort: QueuePort,
    private readonly storagePort: StoragePort,
    private readonly fileSystemPort: FileSystemPort,
    private readonly videoProcessorPort: VideoProcessorPort,
    private readonly notificationPort: NotificationPort
  ) {}

  async execute(queueUrl: string): Promise<void> {
    try {
      const messages = await this.queuePort.receiveMessages(queueUrl);
      
      if (messages.length === 0) {
        console.log('Nenhuma mensagem encontrada na fila.');
        return;
      }

      for (const message of messages) {
        await this.processMessage(message, queueUrl);
      }
    } catch (error) {
      console.error('Erro ao processar fila:', error);
      await this.notificationPort.notifyError({ queueUrl }, error);
    }
  }

  private async processMessage(message: VideoProcessingMessage, queueUrl: string): Promise<void> {
    try {
      const videoData = message.parseBody();
      const videoProcessing = VideoProcessing.fromData(videoData);
      
      console.log('Dados do vídeo para processamento:', videoProcessing.toData());
      
      const result = await this.processVideo(videoProcessing);
      
      if (result.success) {
        await this.notificationPort.notifySuccess(result);
      } else {
        await this.notificationPort.notifyError(videoProcessing.toData(), result.error);
      }

      // Remove mensagem da fila após processamento
      if (message.receiptHandle) {
        await this.queuePort.deleteMessage(queueUrl, message.receiptHandle);
        console.log('Mensagem removida da fila:', message.id);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      await this.notificationPort.notifyError({ rawBody: message.body }, error);
      
      // Remove mensagem mesmo com erro para evitar reprocessamento infinito
      if (message.receiptHandle) {
        await this.queuePort.deleteMessage(queueUrl, message.receiptHandle);
      }
    }
  }

  private async processVideo(videoProcessing: VideoProcessing): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      success: false,
      registerId: videoProcessing.registerId,
      savedVideoKey: videoProcessing.savedVideoKey,
      originalVideoName: videoProcessing.originalVideoName,
      type: videoProcessing.type
    };

    try {
      // Download do arquivo do S3
      const fileBuffer = await this.storagePort.downloadFile('poc-bucket', videoProcessing.savedVideoKey);
      if (!fileBuffer) {
        throw new Error('Arquivo não encontrado no S3');
      }

      // Preparar diretórios temporários
      const tempDir = path.join(process.cwd(), 'tmp');
      await this.fileSystemPort.mkdir(tempDir);
      
      const filePath = path.join(tempDir, videoProcessing.originalVideoName || videoProcessing.savedVideoKey);
      await this.fileSystemPort.writeFile(filePath, fileBuffer);
      console.log('Arquivo salvo em:', filePath);

      // Processar frames
      const outputDir = path.join(process.cwd(), 'outputs');
      await this.fileSystemPort.ensureDir(outputDir);
      
      const id = uuidv4();
      const tempFramesDir = path.join(tempDir, id);
      await this.fileSystemPort.ensureDir(tempFramesDir);

      // Extrair frames
      const frames = await this.videoProcessorPort.extractFrames(filePath, tempFramesDir);
      
      if (frames.length === 0) {
        throw new Error('Nenhum frame extraído');
      }      
      
      // Criar ZIP e fazer upload para S3
      const zipName = `frames_${id}.zip`;
      const zipPath = path.join(outputDir, zipName);
      const savedZipKey = await this.videoProcessorPort.createZipFromFrames(tempFramesDir, zipPath, 'poc-bucket');

      // Limpeza
      await this.fileSystemPort.remove(tempFramesDir);
      await this.fileSystemPort.remove(filePath);      
      
      result.success = true;
      result.outputPath = zipPath;
      result.savedZipKey = savedZipKey;
      
      return result;
    } catch (error) {
      console.error('Erro ao processar vídeo:', error);
      result.error = error as Error;
      return result;
    }
  }
}
