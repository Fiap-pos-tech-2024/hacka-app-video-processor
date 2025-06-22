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
    
    this.sqsClient = new SQSClient({
      region: config.aws.region,
      endpoint: config.aws.endpoint,
      credentials: config.aws.credentials,
    });

    this.s3Client = new S3Client({
      region: config.aws.region,
      endpoint: config.aws.endpoint,
      forcePathStyle: config.s3.forcePathStyle,
      credentials: config.aws.credentials,
    });
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
      this.createStorageAdapter()
    );
  }

  createNotificationAdapter(): ConsoleNotificationAdapter {
    return new ConsoleNotificationAdapter();
  }

  createProcessVideoUseCase(): ProcessVideoUseCase {
    return new ProcessVideoUseCase(
      this.createQueueAdapter(),
      this.createStorageAdapter(),
      this.createFileSystemAdapter(),
      this.createVideoProcessorAdapter(),
      this.createNotificationAdapter()
    );
  }

  createCreateQueueUseCase(): CreateQueueUseCase {
    return new CreateQueueUseCase(this.createQueueAdapter());
  }
}
