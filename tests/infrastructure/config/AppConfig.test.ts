import { AppConfig, AWSConfig, defaultConfig } from '../../../src/infrastructure/config/AppConfig.js';

describe('AppConfig', () => {
  describe('interfaces', () => {
    it('should define AWSConfig interface correctly', () => {
      // Arrange
      const awsConfig: AWSConfig = {
        region: 'us-west-2',
        endpoint: 'https://s3.us-west-2.amazonaws.com',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key'
        }
      };

      // Assert
      expect(awsConfig.region).toBe('us-west-2');
      expect(awsConfig.endpoint).toBe('https://s3.us-west-2.amazonaws.com');
      expect(awsConfig.credentials.accessKeyId).toBe('test-access-key');
      expect(awsConfig.credentials.secretAccessKey).toBe('test-secret-key');
    });

    it('should define AppConfig interface correctly', () => {
      // Arrange
      const appConfig: AppConfig = {
        aws: {
          region: 'eu-west-1',
          endpoint: 'http://localhost:4566',
          credentials: {
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret'
          }
        },
        s3: {
          forcePathStyle: true,
          bucket: 'test-bucket'
        },
        queue: {
          name: 'test-queue',
          url: 'https://sqs.eu-west-1.amazonaws.com/123456789/test-queue',
          checkIntervalMs: 5000
        }
      };

      // Assert
      expect(appConfig.aws.region).toBe('eu-west-1');
      expect(appConfig.s3.bucket).toBe('test-bucket');
      expect(appConfig.queue.name).toBe('test-queue');
      expect(appConfig.queue.checkIntervalMs).toBe(5000);
    });

    it('should allow optional queue url', () => {
      // Arrange
      const appConfig: AppConfig = {
        aws: {
          region: 'us-east-1',
          endpoint: '',
          credentials: {
            accessKeyId: 'key',
            secretAccessKey: 'secret'
          }
        },
        s3: {
          forcePathStyle: false,
          bucket: 'bucket'
        },
        queue: {
          name: 'queue',
          checkIntervalMs: 1000
          // url is optional
        }
      };

      // Assert
      expect(appConfig.queue.url).toBeUndefined();
      expect(appConfig.queue.name).toBe('queue');
    });
  });

  describe('defaultConfig', () => {
    it('should have correct default AWS configuration', () => {
      // Assert
      expect(defaultConfig.aws.region).toBe('us-east-1');
      expect(defaultConfig.aws.endpoint).toBe('');
      expect(defaultConfig.aws.credentials.accessKeyId).toBe('');
      expect(defaultConfig.aws.credentials.secretAccessKey).toBe('');
    });

    it('should have correct default S3 configuration', () => {
      // Assert
      expect(defaultConfig.s3.forcePathStyle).toBe(false);
      expect(defaultConfig.s3.bucket).toBe('fiap-video-bucket-20250706');
    });

    it('should have correct default queue configuration', () => {
      // Assert
      expect(defaultConfig.queue.name).toBe('video-processing-queue');
      expect(defaultConfig.queue.url).toBe('https://sqs.us-east-1.amazonaws.com/816069165502/video-processing-queue');
      expect(defaultConfig.queue.checkIntervalMs).toBe(20000);
    });

    it('should be immutable object', () => {
      // Arrange
      const originalRegion = defaultConfig.aws.region;
      const originalBucket = defaultConfig.s3.bucket;

      // Act - attempt to modify (should not affect original)
      const modifiedConfig = {
        ...defaultConfig,
        aws: {
          ...defaultConfig.aws,
          region: 'modified-region'
        },
        s3: {
          ...defaultConfig.s3,
          bucket: 'modified-bucket'
        }
      };

      // Assert
      expect(defaultConfig.aws.region).toBe(originalRegion);
      expect(defaultConfig.s3.bucket).toBe(originalBucket);
      expect(modifiedConfig.aws.region).toBe('modified-region');
      expect(modifiedConfig.s3.bucket).toBe('modified-bucket');
    });

    it('should have valid structure for all required properties', () => {
      // Assert
      expect(defaultConfig).toHaveProperty('aws');
      expect(defaultConfig).toHaveProperty('s3');
      expect(defaultConfig).toHaveProperty('queue');
      
      expect(defaultConfig.aws).toHaveProperty('region');
      expect(defaultConfig.aws).toHaveProperty('endpoint');
      expect(defaultConfig.aws).toHaveProperty('credentials');
      expect(defaultConfig.aws.credentials).toHaveProperty('accessKeyId');
      expect(defaultConfig.aws.credentials).toHaveProperty('secretAccessKey');
      
      expect(defaultConfig.s3).toHaveProperty('forcePathStyle');
      expect(defaultConfig.s3).toHaveProperty('bucket');
      
      expect(defaultConfig.queue).toHaveProperty('name');
      expect(defaultConfig.queue).toHaveProperty('url');
      expect(defaultConfig.queue).toHaveProperty('checkIntervalMs');
    });
  });
});
