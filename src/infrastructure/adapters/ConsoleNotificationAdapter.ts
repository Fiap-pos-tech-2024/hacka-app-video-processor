import { NotificationPort } from '../../domain/ports/NotificationPort.js';
import { ProcessingResult } from '../../domain/entities/VideoProcessing.js';

export class ConsoleNotificationAdapter implements NotificationPort {
  private readonly notificationUrl = process.env.EXTERNAL_API_URL 
    ? `${process.env.EXTERNAL_API_URL}/api/notify/success`
    : 'http://ms-shared-alb-1798493639.us-east-1.elb.amazonaws.com/api/notify/success';
  
  private readonly statusUpdateUrl = process.env.EXTERNAL_API_URL 
    ? `${process.env.EXTERNAL_API_URL}/video-upload-app/video`
    : 'http://ms-shared-alb-1798493639.us-east-1.elb.amazonaws.com/video-upload-app/video';
  
  constructor(private readonly bucket: string) {}

  private buildS3Url(bucket: string, key: string): string {
    // Sempre usar AWS S3 real com URL regional correta
    return `https://${bucket}.s3.us-east-1.amazonaws.com/${key}`;
  }

  async notifySuccess(result: ProcessingResult): Promise<void> {
    const bucket = this.bucket;
    
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

    // Atualizar status na API do microserviço
    try {
      await this.updateVideoStatus(result, result.savedZipKey);
    } catch (error) {
      console.error('❌ Erro ao atualizar status na API do microserviço:', error);
      // Não falha o processamento por causa da atualização de status
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

  private async updateVideoStatus(result: ProcessingResult, savedZipKey?: string): Promise<void> {
    if (!result.user?.authorization) {
      console.warn('⚠️ Autorização do usuário não encontrada, pulando atualização de status');
      return;
    }

    if (!result.registerId) {
      console.warn('⚠️ RegisterId não encontrado, pulando atualização de status');
      return;
    }

    if (!savedZipKey) {
      console.warn('⚠️ SavedZipKey não encontrado, pulando atualização de status');
      return;
    }

    const payload = {
      status: "FINISHED",
      savedZipKey: savedZipKey
    };

    const updateUrl = `${this.statusUpdateUrl}/${result.registerId}`;

    console.log('📤 Atualizando status na API do microserviço:', updateUrl);
    console.log('📋 Payload:', payload);

    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'accept': 'application/json',
        'Authorization': result.user.authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log('✅ Status atualizado com sucesso na API do microserviço');
  }
}
