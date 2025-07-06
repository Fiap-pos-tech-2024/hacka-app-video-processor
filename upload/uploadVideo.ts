import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { promises as fs } from 'fs';
import path from 'path';

// Configurações
const BUCKET_NAME = 'poc-bucket'; // Substitua pelo nome real do bucket
const QUEUE_URL = 'http://localhost:4566/000000000000/video_processed';
const S3_ENDPOINT = 'http://localhost:4566';

const s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: S3_ENDPOINT, // Altere se necessário
    forcePathStyle: true,
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
    },
});

const sqsClient = new SQSClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566', // Altere se necessário
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
    },
});

function buildS3Url(bucket: string, key: string): string {
    // Para LocalStack ou endpoints customizados com forcePathStyle
    if (S3_ENDPOINT.includes('localhost') || S3_ENDPOINT.includes('localstack')) {
        const cleanEndpoint = S3_ENDPOINT.replace(/\/$/, '');
        return `${cleanEndpoint}/${bucket}/${key}`;
    }
    
    // Para AWS S3 real
    return `https://${bucket}.s3.amazonaws.com/${key}`;
}

async function uploadVideoAndNotify(filePath: string, type: string, registerId: string) {
    const fileName = path.basename(filePath);
    const fileBuffer = await fs.readFile(filePath);
    const savedVideoKey = `${Date.now()}_${fileName}`;

    // Upload para o S3
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: savedVideoKey,
        Body: fileBuffer,
    }));
    
    const fullS3Url = buildS3Url(BUCKET_NAME, savedVideoKey);
    console.log('URL completa do video:', fullS3Url);

    // Monta mensagem para a fila
    const messageBody = JSON.stringify({
        registerId,
        savedVideoKey,
        originalVideoName: fileName,
        type,
    });

    // Envia mensagem para a fila
    await sqsClient.send(new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: messageBody,
    }));
    console.log('Mensagem enviada para a fila:', messageBody);
}

// Exemplo de uso:
// node uploadVideo.js ./meuvideo.mp4 tipo_video id_registro
if (require.main === module) {
    const [,, filePath, type, registerId] = process.argv;
    if (!filePath || !type || !registerId) {
        console.error('Uso: node uploadVideo.js <caminho_do_arquivo> <tipo> <registerId>');
        process.exit(1);
    }
    uploadVideoAndNotify(filePath, type, registerId).catch(console.error);
}
