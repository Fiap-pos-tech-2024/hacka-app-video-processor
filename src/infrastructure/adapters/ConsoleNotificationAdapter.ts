import { NotificationPort } from '../../domain/ports/NotificationPort.js';
import { ProcessingResult } from '../../domain/entities/VideoProcessing.js';

export class ConsoleNotificationAdapter implements NotificationPort {
  async notifySuccess(result: ProcessingResult): Promise<void> {
    console.log('✅ Processamento concluído com sucesso:', {
      registerId: result.registerId,
      savedVideoKey: result.savedVideoKey,
      originalVideoName: result.originalVideoName,
      type: result.type,
      outputPath: result.outputPath
    });
    
    // TODO: Implementar notificação real para sistema externo
    // Por exemplo: fazer HTTP POST para webhook, enviar para outro SQS, etc.
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
}
