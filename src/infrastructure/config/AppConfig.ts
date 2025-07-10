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
    region: 'us-east-1',
    endpoint: '',
    credentials: {
      accessKeyId: '',
      secretAccessKey: '',
    },
  },
  s3: {
    forcePathStyle: false,
    bucket: 'fiap-video-bucket-20250706',
  },
  queue: {
    name: 'video-processing-queue',
    url: 'https://sqs.us-east-1.amazonaws.com/816069165502/video-processing-queue',
    checkIntervalMs: 20000,
  },
};
