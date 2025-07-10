import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { StoragePort } from '../../domain/ports/StoragePort.js';

export class AWSS3Adapter implements StoragePort {
  constructor(
    private readonly s3Client: S3Client
  ) {}

  private buildS3Url(bucket: string, key: string): string {
    // Sempre usar AWS S3 real com URL regional correta
    return `https://${bucket}.s3.us-east-1.amazonaws.com/${key}`;
  }

  async downloadFile(bucket: string, key: string): Promise<Buffer | undefined> {
    const params = {
      Bucket: bucket,
      Key: key,
    };

    // Mostrar URLs antes de começar o download
    const fullUrl = this.buildS3Url(bucket, key);
    console.log('🔗 URLs de download do S3:');
    console.log(`   📍 S3 Endpoint: ${this.s3Client.config.endpoint || 'https://s3.us-east-1.amazonaws.com'}`);
    console.log(`   🪣 Bucket: ${bucket}`);
    console.log(`   🔑 Key: ${key}`);
    console.log(`   🌐 URL completa: ${fullUrl}`);
    console.log(`📥 Iniciando download do arquivo...`);

    try {
      const data = await this.s3Client.send(new GetObjectCommand(params));
      
      if (data.Body instanceof Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of data.Body) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const fileBuffer = Buffer.concat(chunks);
        console.log(`✅ Arquivo baixado com sucesso do S3!`);
        console.log(`📊 Tamanho do arquivo baixado: ${fileBuffer.length} bytes`);
        console.log(`🔗 URL do arquivo: ${fullUrl}`);
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

    // Mostrar URLs antes de começar o upload
    const fullUrl = this.buildS3Url(bucket, key);
    console.log('🔗 URLs de upload para S3:');
    console.log(`   📍 S3 Endpoint: ${this.s3Client.config.endpoint || 'https://s3.us-east-1.amazonaws.com'}`);
    console.log(`   🪣 Bucket: ${bucket}`);
    console.log(`   🔑 Key: ${key}`);
    console.log(`   🌐 URL completa: ${fullUrl}`);
    console.log(`   📊 Tamanho do arquivo: ${buffer.length} bytes`);
    console.log(`📤 Iniciando upload do arquivo...`);

    try {
      await this.s3Client.send(new PutObjectCommand(params));
      console.log(`✅ Arquivo enviado com sucesso para S3!`);
      console.log(`🔗 URL do arquivo: ${fullUrl}`);
    } catch (error) {
      console.error('Erro ao enviar arquivo para S3:', error);
      throw error;
    }
  }
}
