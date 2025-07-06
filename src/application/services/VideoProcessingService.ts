import { ProcessVideoUseCase } from '../../domain/useCases/ProcessVideoUseCase.js';
import { CreateQueueUseCase } from '../../domain/useCases/CreateQueueUseCase.js';

export class VideoProcessingService {
  constructor(
    private readonly processVideoUseCase: ProcessVideoUseCase,
    private readonly createQueueUseCase: CreateQueueUseCase,
    private readonly queueIdentifier: string, // Pode ser nome da fila ou URL
    private readonly checkIntervalMs: number
  ) {}
  
  async start(): Promise<void> {
    console.log('🚀 Iniciando serviço de processamento de vídeos...');
    
    let queueUrl: string | undefined;
    
    // Verificar se já é uma URL de fila SQS
    if (this.queueIdentifier.includes('sqs') && this.queueIdentifier.includes('amazonaws.com')) {
      console.log('✅ Usando URL da fila SQS fornecida:', this.queueIdentifier);
      queueUrl = this.queueIdentifier;
    } else {
      // Criar/verificar fila pelo nome
      console.log('🔄 Criando/verificando fila:', this.queueIdentifier);
      queueUrl = await this.createQueueUseCase.execute(this.queueIdentifier);
      
      if (!queueUrl) {
        console.error('❌ Não foi possível criar/acessar a fila. Encerrando aplicação.');
        return;
      }
    }

    console.log('✅ Fila configurada:', queueUrl);
    console.log(`🔄 Verificando mensagens a cada ${this.checkIntervalMs}ms`);

    // Processar mensagens imediatamente
    try {
      await this.processVideoUseCase.execute(queueUrl);
    } catch (error) {
      console.error('❌ Erro no processamento inicial:', error);
    }

    // Configurar intervalo de processamento
    setInterval(async () => {
      try {
        await this.processVideoUseCase.execute(queueUrl!);
      } catch (error) {
        console.error('❌ Erro no processamento em intervalo:', error);
      }
    }, this.checkIntervalMs);

    console.log('✅ Serviço iniciado com sucesso!');
  }
}
