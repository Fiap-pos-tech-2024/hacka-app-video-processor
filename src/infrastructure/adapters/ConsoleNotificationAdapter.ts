import { NotificationPort } from '../../domain/ports/NotificationPort.js';
import { ProcessingResult } from '../../domain/entities/VideoProcessing.js';

export class ConsoleNotificationAdapter implements NotificationPort {
  constructor(private readonly s3Config?: { endpoint?: string; bucket: string }) {}

  private buildS3Url(bucket: string, key: string): string {
    const baseEndpoint = this.s3Config?.endpoint || 'https://s3.amazonaws.com';
    
    // Para LocalStack ou endpoints customizados com forcePathStyle
    if (this.s3Config?.endpoint && (this.s3Config.endpoint.includes('localhost') || this.s3Config.endpoint.includes('localstack'))) {
      let cleanEndpoint = baseEndpoint.replace(/\/$/, '');
      
      // Se estivermos em um container e a URL contém 'localstack', substitui por localhost para acesso externo
      if (cleanEndpoint.includes('localstack')) {
        cleanEndpoint = cleanEndpoint.replace('localstack', 'localhost');
      }
      
      return `${cleanEndpoint}/${bucket}/${key}`;
    }
    
    // Para AWS S3 real
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }

  async notifySuccess(result: ProcessingResult): Promise<void> {
    const bucket = this.s3Config?.bucket || 'poc-bucket';
    
    // Construir URLs completas
    const videoUrl = result.savedVideoKey ? this.buildS3Url(bucket, result.savedVideoKey) : undefined;
    const zipUrl = result.savedZipKey ? this.buildS3Url(bucket, result.savedZipKey) : undefined;
    
    console.log('Processamento concluído com sucesso:', {
      registerId: result.registerId,
      savedVideoKey: result.savedVideoKey,
      videoUrl: videoUrl,
      originalVideoName: result.originalVideoName,
      type: result.type,
      email: result.email,
      outputPath: result.outputPath,
      savedZipKey: result.savedZipKey,
      zipUrl: zipUrl
    });
    
    // TODO: Implementar notificação real para sistema externo
    // Por exemplo: fazer HTTP POST para webhook, enviar para outro SQS, etc.
  }

  async notifyError(context: any, error: any): Promise<void> {
    console.error('Erro no processamento:', {
      context,
      error: error.message || error,
      stack: error.stack
    });
    
    // TODO: Implementar notificação de erro para sistema externo
    // Por exemplo: enviar email, salvar em log centralizado, etc.
  }
}
