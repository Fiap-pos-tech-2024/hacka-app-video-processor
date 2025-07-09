export interface AWSConfig {
  region: string;
  endpoint: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface AppConfig {
  aws: AWSConfig;
  s3: {
    forcePathStyle: boolean;
    bucket: string;
  };
  queue: {
    name: string;
    url?: string;
    checkIntervalMs: number;
  };
}

export const defaultConfig: AppConfig = {
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.NODE_ENV === 'production' ? '' : (process.env.AWS_ENDPOINT || 'http://localhost:4566'),
    credentials: process.env.NODE_ENV === 'production' 
      ? {
          accessKeyId: '', // AWS usa as credenciais do container/IAM role
          secretAccessKey: '',
        }
      : {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
  },
  s3: {
    forcePathStyle: process.env.NODE_ENV !== 'production',
    bucket: process.env.S3_BUCKET || 'fiap-video-bucket-20250706',
  },
  queue: {
    name: process.env.SQS_QUEUE_URL ? 'video-processing-queue' : 'video_processed',
    url: process.env.SQS_QUEUE_URL,
    checkIntervalMs: 20000,
  },
};
