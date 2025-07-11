import { NotificationPort } from '../../domain/ports/NotificationPort.js';
import { ProcessingResult } from '../../domain/entities/VideoProcessing.js';

export class ConsoleNotificationAdapter implements NotificationPort {
  private readonly notificationUrl: string;
  private readonly statusUpdateUrl: string;

  constructor(
    private readonly bucket: string,
    private readonly fetchFn: typeof fetch = globalThis.fetch
  ) {
    const baseUrl = process.env.BASE_PATH_EXTERNAL_API;
    
    if (!baseUrl) {
      throw new Error('Missing required environment variable: BASE_PATH_EXTERNAL_API');
    }

    this.notificationUrl = `${baseUrl}/api/notify/success`;
    this.statusUpdateUrl = `${baseUrl}/api/video`;
  }

  private buildS3Url(bucket: string, key: string): string {
    return `https://${bucket}.s3.us-east-1.amazonaws.com/${key}`;
  }

  async notifySuccess(result: ProcessingResult): Promise<void> {
    const bucket = this.bucket;

    const videoUrl = result.savedVideoKey ? this.buildS3Url(bucket, result.savedVideoKey) : undefined;
    const zipUrl = result.savedZipKey ? this.buildS3Url(bucket, result.savedZipKey) : undefined;

    console.log('✅ Processamento concluído com sucesso:', {
      registerId: result.registerId,
      savedVideoKey: result.savedVideoKey,
      videoUrl,
      originalVideoName: result.originalVideoName,
      type: result.type,
      user: result.user,
      outputPath: result.outputPath,
      savedZipKey: result.savedZipKey,
      zipUrl
    });

    try {
      await this.sendSuccessNotification(result, zipUrl);
    } catch (error) {
      console.error('Erro ao enviar notificação para API externa:', error);
    }

    try {
      await this.updateVideoStatus(result, result.savedZipKey);
    } catch (error) {
      console.error('Erro ao atualizar status na API do microserviço:', error);
    }
  }

  async notifyError(context: any, error: any): Promise<void> {
    console.error('❌ Erro no processamento:', {
      context,
      error: error.message || error,
      stack: error.stack
    });
  }

  private async sendSuccessNotification(result: ProcessingResult, zipUrl?: string): Promise<void> {
    if (!result.user?.email || !result.user?.authorization) {
      console.warn('Email ou autorização do usuário não encontrados, pulando notificação externa');
      return;
    }

    if (!zipUrl) {
      console.warn('URL do ZIP não encontrada, pulando notificação externa');
      return;
    }

    const payload = {
      to: result.user.email,
      message: "Success!",
      file: zipUrl
    };

    console.log('Enviando notificação para API externa:', this.notificationUrl);
    console.log('Payload:', payload);

    const response = await this.fetchFn(this.notificationUrl, {
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
      console.warn('Autorização do usuário não encontrada, pulando atualização de status');
      return;
    }

    if (!result.registerId) {
      console.warn('RegisterId não encontrado, pulando atualização de status');
      return;
    }

    if (!savedZipKey) {
      console.warn('SavedZipKey não encontrado, pulando atualização de status');
      return;
    }

    const payload = {
      status: "FINISHED",
      savedZipKey
    };

    const updateUrl = `${this.statusUpdateUrl}/${result.registerId}`;

    console.log('Atualizando status na API do microserviço:', updateUrl);
    console.log('Payload:', payload);

    const response = await this.fetchFn(updateUrl, {
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
