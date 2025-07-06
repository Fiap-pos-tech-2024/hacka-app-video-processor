import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { StoragePort } from '../../domain/ports/StoragePort.js';

export class AWSS3Adapter implements StoragePort {
  constructor(
    private readonly s3Client: S3Client,
    private readonly endpoint?: string
  ) {}

  private buildS3Url(bucket: string, key: string): string {
    const baseEndpoint = this.endpoint || 'https://s3.amazonaws.com';
    
    // Para LocalStack ou endpoints customizados com forcePathStyle
    if (this.endpoint && (this.endpoint.includes('localhost') || this.endpoint.includes('localstack'))) {
      let cleanEndpoint = baseEndpoint.replace(/\/$/, '');
      
      // Se estivermos em um container e a URL contém 'localstack', substitui por localhost para acesso externo
      if (cleanEndpoint.includes('localstack')) {
        cleanEndpoint = cleanEndpoint.replace('localstack', 'localhost');
      }
      
      return `${cleanEndpoint}/${bucket}/${key}`;
    }
    
    // Para AWS S3 real
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }

  async downloadFile(bucket: string, key: string): Promise<Buffer | undefined> {
    const params = {
      Bucket: bucket,
      Key: key,
    };

    try {
      const data = await this.s3Client.send(new GetObjectCommand(params));
      
      if (data.Body instanceof Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of data.Body) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const fileBuffer = Buffer.concat(chunks);
        const fullUrl = this.buildS3Url(bucket, key);
        return fileBuffer;
      } else {
        console.error('Body não é um stream legível.');
        return undefined;
      }
    } catch (error) {
      console.error('Erro ao baixar arquivo do S3:', error);
      throw error;
    }
  }

  async uploadFile(bucket: string, key: string, buffer: Buffer): Promise<void> {
    const params = {
      Bucket: bucket,
      Key: key,
      Body: buffer,
    };

    try {
      await this.s3Client.send(new PutObjectCommand(params));
      const fullUrl = this.buildS3Url(bucket, key);
    } catch (error) {
      console.error('Erro ao enviar arquivo para S3:', error);
      throw error;
    }
  }
}
