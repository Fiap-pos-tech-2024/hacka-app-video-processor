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
    endpoint: process.env.AWS_ENDPOINT || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4566'),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || (process.env.NODE_ENV === 'production' ? '' : 'test'),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || (process.env.NODE_ENV === 'production' ? '' : 'test'),
    },
  },
  s3: {
    forcePathStyle: process.env.AWS_ENDPOINT ? true : (process.env.NODE_ENV !== 'production'),
    bucket: process.env.S3_BUCKET || (process.env.NODE_ENV === 'production' ? '' : 'fiap-video-bucket-20250706'),
  },
  queue: {
    name: process.env.SQS_QUEUE_NAME || (process.env.NODE_ENV === 'production' ? 'video-processing-queue' : 'video_processed'),
    url: process.env.SQS_QUEUE_URL || (
      // Se AWS_ENDPOINT está definido (LocalStack), usar fila local
      process.env.AWS_ENDPOINT ? undefined : 
      // Se não, e estamos em produção, usar fila da AWS
      (process.env.NODE_ENV === 'production' 
        ? 'https://sqs.us-east-1.amazonaws.com/816069165502/video-processing-queue' 
        : undefined)
    ),
    checkIntervalMs: parseInt(process.env.QUEUE_CHECK_INTERVAL_MS || '20000'),
  },
};
