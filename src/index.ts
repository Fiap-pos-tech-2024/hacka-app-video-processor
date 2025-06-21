import { defaultConfig } from './infrastructure/config/AppConfig.js';
import { DependencyFactory } from './infrastructure/factories/DependencyFactory.js';
import { VideoProcessingService } from './application/services/VideoProcessingService.js';

async function main(): Promise<void> {
  try {
    console.log('🎬 Iniciando aplicação de processamento de vídeos...');
    
    // Criar factory de dependências
    const dependencyFactory = new DependencyFactory(defaultConfig);
    
    // Criar casos de uso
    const processVideoUseCase = dependencyFactory.createProcessVideoUseCase();
    const createQueueUseCase = dependencyFactory.createCreateQueueUseCase();
    
    // Criar e iniciar serviço principal
    const videoProcessingService = new VideoProcessingService(
      processVideoUseCase,
      createQueueUseCase,
      defaultConfig.queue.name,
      defaultConfig.queue.checkIntervalMs
    );
    
    await videoProcessingService.start();
    
    // Manter aplicação rodando
    process.on('SIGINT', () => {
      console.log('\n🛑 Encerrando aplicação...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Erro crítico na aplicação:', error);
    process.exit(1);
  }
}

main();




