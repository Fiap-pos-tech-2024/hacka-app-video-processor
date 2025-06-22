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
  };
  queue: {
    name: string;
    checkIntervalMs: number;
  };
}

export const defaultConfig: AppConfig = {
  aws: {
    region: 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT || (process.env.NODE_ENV === 'production' ? 'http://localstack:4566' : 'http://localhost:4566'),
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  },
  s3: {
    forcePathStyle: true,
  },
  queue: {
    name: 'video_processed',
    checkIntervalMs: 20000,
  },
};
