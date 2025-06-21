import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { StoragePort } from '../../domain/ports/StoragePort.js';

export class AWSS3Adapter implements StoragePort {
  constructor(private readonly s3Client: S3Client) {}

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
        console.log('Arquivo baixado do S3:', key);
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
      console.log('Arquivo enviado para S3:', key);
    } catch (error) {
      console.error('Erro ao enviar arquivo para S3:', error);
      throw error;
    }
  }
}
