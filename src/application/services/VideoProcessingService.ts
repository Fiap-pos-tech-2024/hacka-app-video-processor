import { ProcessVideoUseCase } from '../../domain/useCases/ProcessVideoUseCase.js';
import { CreateQueueUseCase } from '../../domain/useCases/CreateQueueUseCase.js';

export class VideoProcessingService {
  constructor(
    private readonly processVideoUseCase: ProcessVideoUseCase,
    private readonly createQueueUseCase: CreateQueueUseCase,
    private readonly queueName: string,
    private readonly checkIntervalMs: number
  ) {}

  async start(): Promise<void> {
    console.log('🚀 Iniciando serviço de processamento de vídeos...');
    
    // Criar/verificar fila
    const queueUrl = await this.createQueueUseCase.execute(this.queueName);
    
    if (!queueUrl) {
      console.error('❌ Não foi possível criar/acessar a fila. Encerrando aplicação.');
      return;
    }

    console.log('✅ Fila configurada:', queueUrl);
    console.log(`🔄 Verificando mensagens a cada ${this.checkIntervalMs}ms`);

    // Processar mensagens imediatamente
    await this.processVideoUseCase.execute(queueUrl);

    // Configurar intervalo de processamento
    setInterval(async () => {
      await this.processVideoUseCase.execute(queueUrl);
    }, this.checkIntervalMs);

    console.log('✅ Serviço iniciado com sucesso!');
  }
}
