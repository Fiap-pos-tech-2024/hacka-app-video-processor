import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { promises as fs } from 'fs';
import path from 'path';

// Configurações
const BUCKET_NAME = 'poc-bucket'; // Substitua pelo nome real do bucket
const QUEUE_URL = 'http://localhost:4566/000000000000/video_processed';
const s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566', // Altere se necessário
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
    console.log('Arquivo enviado ao S3:', savedVideoKey);

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
