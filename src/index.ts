import { defaultConfig } from './infrastructure/config/AppConfig.js';
import { DependencyFactory } from './infrastructure/factories/DependencyFactory.js';
import { VideoProcessingService } from './application/services/VideoProcessingService.js';

async function main(): Promise<void> {
  try {
    console.log('[STARTUP] 🎬 Iniciando aplicação de processamento de vídeos...');
    
    // Configurações hardcoded para produção
    const queueUrl = 'https://sqs.us-east-1.amazonaws.com/816069165502/video-processing-queue';
    const bucketName = 'fiap-video-bucket-20250706';
    const httpPort = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    
    // Criar factory de dependências (config não é mais usado internamente)
    const dependencyFactory = new DependencyFactory(defaultConfig);
    
    // Criar casos de uso
    const processVideoUseCase = dependencyFactory.createProcessVideoUseCase();
    const createQueueUseCase = dependencyFactory.createCreateQueueUseCase();
    
    // Criar servidor HTTP
    const httpServer = dependencyFactory.createHttpServer();
    
    console.log('📋 Configurações de Produção:');
    console.log(`   - Região AWS: us-east-1`);
    console.log(`   - Bucket S3: ${bucketName}`);
    console.log(`   - Fila SQS: ${queueUrl}`);
    console.log(`   - Porta HTTP: ${httpPort}`);
    console.log(`   - Ambiente: production`);
    
    // Iniciar servidor HTTP
    await httpServer.start(httpPort);
    
    // Criar e iniciar serviço principal
    const videoProcessingService = new VideoProcessingService(
      processVideoUseCase,
      createQueueUseCase,
      queueUrl,
      20000 
    );
    
    await videoProcessingService.start();
    
    // Manter aplicação rodando
    process.on('SIGINT', async () => {
      console.log('\n🛑 Encerrando aplicação...');
      await httpServer.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('[ERROR] Erro crítico na aplicação:', error);
    process.exit(1);
  }
}

main();




