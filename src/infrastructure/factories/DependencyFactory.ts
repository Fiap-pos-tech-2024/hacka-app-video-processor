import { SQSClient } from '@aws-sdk/client-sqs';
import { S3Client } from '@aws-sdk/client-s3';
import { AppConfig } from '../config/AppConfig.js';
import { AWSSQSAdapter } from '../adapters/AWSSQSAdapter.js';
import { AWSS3Adapter } from '../adapters/AWSS3Adapter.js';
import { NodeFileSystemAdapter } from '../adapters/NodeFileSystemAdapter.js';
import { FFmpegVideoProcessor } from '../adapters/FFmpegVideoProcessor.js';
import { ConsoleNotificationAdapter } from '../adapters/ConsoleNotificationAdapter.js';
import { ProcessVideoUseCase } from '../../domain/useCases/ProcessVideoUseCase.js';
import { CreateQueueUseCase } from '../../domain/useCases/CreateQueueUseCase.js';

export class DependencyFactory {
  private config: AppConfig;
  private sqsClient: SQSClient;
  private s3Client: S3Client;

  constructor(config: AppConfig) {
    this.config = config;
    
    const sqsConfig: any = {
      region: config.aws.region,
    };
    
    const s3Config: any = {
      region: config.aws.region,
    };
    
    // Adiciona endpoint e credentials se estivermos usando LocalStack ou desenvolvimento
    if (config.aws.endpoint) {
      sqsConfig.endpoint = config.aws.endpoint;
      sqsConfig.credentials = config.aws.credentials;
      s3Config.endpoint = config.aws.endpoint;
      s3Config.credentials = config.aws.credentials;
      s3Config.forcePathStyle = config.s3.forcePathStyle;
    }
    
    this.sqsClient = new SQSClient(sqsConfig);
    this.s3Client = new S3Client(s3Config);
  }

  createQueueAdapter(): AWSSQSAdapter {
    return new AWSSQSAdapter(this.sqsClient);
  }

  createStorageAdapter(): AWSS3Adapter {
    return new AWSS3Adapter(this.s3Client, this.config.aws.endpoint);
  }

  createFileSystemAdapter(): NodeFileSystemAdapter {
    return new NodeFileSystemAdapter();
  }
  createVideoProcessorAdapter(): FFmpegVideoProcessor {
    return new FFmpegVideoProcessor(
      this.createFileSystemAdapter(),
      this.createStorageAdapter(),
      {
        endpoint: this.config.aws.endpoint,
        bucket: this.config.s3.bucket
      }
    );
  }

  createNotificationAdapter(): ConsoleNotificationAdapter {
    return new ConsoleNotificationAdapter({
      endpoint: this.config.aws.endpoint,
      bucket: this.config.s3.bucket
    });
  }

  createProcessVideoUseCase(): ProcessVideoUseCase {
    return new ProcessVideoUseCase(
      this.createQueueAdapter(),
      this.createStorageAdapter(),
      this.createFileSystemAdapter(),
      this.createVideoProcessorAdapter(),
      this.createNotificationAdapter(),
      this.config.s3.bucket
    );
  }

  createCreateQueueUseCase(): CreateQueueUseCase {
    return new CreateQueueUseCase(this.createQueueAdapter());
  }
}
