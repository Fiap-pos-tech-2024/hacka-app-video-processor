import { defaultConfig } from './infrastructure/config/AppConfig.js';
import { DependencyFactory } from './infrastructure/factories/DependencyFactory.js';
import { VideoProcessingService } from './application/services/VideoProcessingService.js';

async function main(): Promise<void> {
  try {
    console.log('[STARTUP] Iniciando aplicação de processamento de vídeos...');
    
    // Criar factory de dependências
    const dependencyFactory = new DependencyFactory(defaultConfig);
    
    // Criar casos de uso
    const processVideoUseCase = dependencyFactory.createProcessVideoUseCase();
    const createQueueUseCase = dependencyFactory.createCreateQueueUseCase();
    
    // Determinar a URL da fila - usar diretamente se fornecida via env, senão criar
    const queueUrl = defaultConfig.queue.url || '';
    const queueName = defaultConfig.queue.name;
    
    console.log('-  Configurações:');
    console.log(`- Região AWS: ${defaultConfig.aws.region}`);
    console.log(`- Bucket S3: ${defaultConfig.s3.bucket}`);
    console.log(`- Fila SQS: ${queueUrl || queueName}`);
    console.log(`- Ambiente: ${process.env.NODE_ENV || 'development'}`);
    
    // Criar e iniciar serviço principal
    const videoProcessingService = new VideoProcessingService(
      processVideoUseCase,
      createQueueUseCase,
      queueUrl || queueName, // Usar URL direta se disponível, senão o nome
      defaultConfig.queue.checkIntervalMs
    );
    
    await videoProcessingService.start();
    
    // Manter aplicação rodando
    process.on('SIGINT', () => {
      console.log('\n Encerrando aplicação...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('[ERROR] Erro crítico na aplicação:', error);
    process.exit(1);
  }
}

main();




