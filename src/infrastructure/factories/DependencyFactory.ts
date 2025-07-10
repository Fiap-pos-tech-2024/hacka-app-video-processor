import { SQSClient } from '@aws-sdk/client-sqs';
import { S3Client } from '@aws-sdk/client-s3';
import { AppConfig } from '../config/AppConfig.js';
import { AWSSQSAdapter } from '../adapters/AWSSQSAdapter.js';
import { AWSS3Adapter } from '../adapters/AWSS3Adapter.js';
import { NodeFileSystemAdapter } from '../adapters/NodeFileSystemAdapter.js';
import { FFmpegVideoProcessor } from '../adapters/FFmpegVideoProcessor.js';
import { ConsoleNotificationAdapter } from '../adapters/ConsoleNotificationAdapter.js';
import { ExpressServerAdapter } from '../adapters/ExpressServerAdapter.js';
import { ProcessVideoUseCase } from '../../domain/useCases/ProcessVideoUseCase.js';
import { CreateQueueUseCase } from '../../domain/useCases/CreateQueueUseCase.js';
import { HealthCheckUseCase } from '../../domain/useCases/HealthCheckUseCase.js';
import { HealthCheckUseCaseImpl } from '../../domain/useCases/HealthCheckUseCaseImpl.js';

export class DependencyFactory {
  private config: AppConfig;
  private sqsClient: SQSClient;
  private s3Client: S3Client;

  constructor(config: AppConfig) {
    this.config = config;
    
    // Configuração hardcoded para produção AWS
    const sqsConfig = {
      region: 'us-east-1',
    };
    
    const s3Config = {
      region: 'us-east-1',
      forcePathStyle: false,
    };
    
    this.sqsClient = new SQSClient(sqsConfig);
    this.s3Client = new S3Client(s3Config);
  }

  createQueueAdapter(): AWSSQSAdapter {
    return new AWSSQSAdapter(this.sqsClient);
  }

  createStorageAdapter(): AWSS3Adapter {
    return new AWSS3Adapter(this.s3Client);
  }

  createFileSystemAdapter(): NodeFileSystemAdapter {
    return new NodeFileSystemAdapter();
  }
  createVideoProcessorAdapter(): FFmpegVideoProcessor {
    return new FFmpegVideoProcessor(
      this.createFileSystemAdapter(),
      this.createStorageAdapter(),
      'fiap-video-bucket-20250706'
    );
  }

  createNotificationAdapter(): ConsoleNotificationAdapter {
    return new ConsoleNotificationAdapter('fiap-video-bucket-20250706');
  }

  createProcessVideoUseCase(): ProcessVideoUseCase {
    return new ProcessVideoUseCase(
      this.createQueueAdapter(),
      this.createStorageAdapter(),
      this.createFileSystemAdapter(),
      this.createVideoProcessorAdapter(),
      this.createNotificationAdapter(),
      'fiap-video-bucket-20250706'
    );
  }

  createCreateQueueUseCase(): CreateQueueUseCase {
    return new CreateQueueUseCase(this.createQueueAdapter());
  }

  createHealthCheckUseCase(): HealthCheckUseCase {
    return new HealthCheckUseCaseImpl(
      this.createQueueAdapter(),
      this.createStorageAdapter(),
      this.createVideoProcessorAdapter()
    );
  }

  createHttpServer(): ExpressServerAdapter {
    return new ExpressServerAdapter(this.createHealthCheckUseCase());
  }
}
