import { NotificationPort } from '../../domain/ports/NotificationPort.js';
import { ProcessingResult } from '../../domain/entities/VideoProcessing.js';

export class ConsoleNotificationAdapter implements NotificationPort {
  private readonly notificationUrl = 'http://ms-shared-alb-1798493639.us-east-1.elb.amazonaws.com/api/notify/success';
  
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
    
    console.log('✅ Processamento concluído com sucesso:', {
      registerId: result.registerId,
      savedVideoKey: result.savedVideoKey,
      videoUrl: videoUrl,
      originalVideoName: result.originalVideoName,
      type: result.type,
      user: result.user,
      outputPath: result.outputPath,
      savedZipKey: result.savedZipKey,
      zipUrl: zipUrl
    });
    
    // Enviar notificação para API externa
    try {
      await this.sendSuccessNotification(result, zipUrl);
    } catch (error) {
      console.error('❌ Erro ao enviar notificação para API externa:', error);
      // Não falha o processamento por causa da notificação
    }
  }

  async notifyError(context: any, error: any): Promise<void> {
    console.error('❌ Erro no processamento:', {
      context,
      error: error.message || error,
      stack: error.stack
    });
    
    // TODO: Implementar notificação de erro para sistema externo
    // Por exemplo: enviar email, salvar em log centralizado, etc.
  }

  private async sendSuccessNotification(result: ProcessingResult, zipUrl?: string): Promise<void> {
    if (!result.user?.email || !result.user?.authorization) {
      console.warn('⚠️ Email ou autorização do usuário não encontrados, pulando notificação externa');
      return;
    }

    if (!zipUrl) {
      console.warn('⚠️ URL do ZIP não encontrada, pulando notificação externa');
      return;
    }

    const payload = {
      to: result.user.email,
      message: "Success!",
      file: zipUrl
    };

    console.log('📤 Enviando notificação para API externa:', this.notificationUrl);
    console.log('📋 Payload:', payload);

    const response = await fetch(this.notificationUrl, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'Authorization': result.user.authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log('✅ Notificação enviada com sucesso para API externa');
  }
}
