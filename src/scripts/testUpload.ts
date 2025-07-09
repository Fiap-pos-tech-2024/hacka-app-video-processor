import { S3Client, PutObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { promises as fs } from 'fs';
import path from 'path';

// Configurações
const BUCKET_NAME = 'poc-bucket';
const QUEUE_URL = 'http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/video_processed';

const s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566',
    forcePathStyle: true,
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
    },
});

const sqsClient = new SQSClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566',
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
    },
});

async function createBucketIfNotExists() {
    try {
        await s3Client.send(new CreateBucketCommand({
            Bucket: BUCKET_NAME,
        }));
        console.log(`[SUCCESS] Bucket "${BUCKET_NAME}" criado/verificado com sucesso`);
    } catch (error: any) {
        if (error.Code !== 'BucketAlreadyOwnedByYou' && error.Code !== 'BucketAlreadyExists') {
            console.error('[ERROR] Erro ao criar bucket:', error);
            throw error;
        }
        console.log(`[SUCCESS] Bucket "${BUCKET_NAME}" já existe`);
    }
}

async function uploadVideoAndNotify(filePath: string, type: string, registerId: string, email: string) {
    console.log('[INIT] Iniciando upload e notificação...');
    
    // Verificar se o arquivo existe
    try {
        await fs.access(filePath);
    } catch (error) {
        console.error(`[ERROR] Arquivo não encontrado: ${filePath}`);
        return;
    }

    // Criar bucket se não existir
    await createBucketIfNotExists();

    const fileName = path.basename(filePath);
    const fileBuffer = await fs.readFile(filePath);
    const savedVideoKey = `${Date.now()}_${fileName}`;

    console.log(`[UPLOAD] Enviando arquivo para S3: ${fileName} -> ${savedVideoKey}`);

    // Upload para o S3
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: savedVideoKey,
        Body: fileBuffer,
    }));
    
    console.log('[SUCCESS] Arquivo enviado ao S3:', savedVideoKey);

    // Monta mensagem para a fila
    const messageBody = JSON.stringify({
        registerId,
        savedVideoKey,
        originalVideoName: fileName,
        type,
        email,
    });

    console.log('[QUEUE] Enviando mensagem para a fila...');
    console.log('[EMAIL] Email a ser enviado:', email);
    console.log('[DATA] Dados da mensagem:', JSON.parse(messageBody));

    // Envia mensagem para a fila
    await sqsClient.send(new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: messageBody,
    }));
    
    console.log('[SUCCESS] Mensagem enviada para a fila com sucesso!');
    console.log('[COMPLETE] Upload concluído! O vídeo será processado em breve.');
}

// Exemplo de uso
async function main() {
    const videoPath = path.join(process.cwd(), 'video', 'videoplayback.mp4');
    const type = 'test-video';
    const registerId = `test-${Date.now()}`;
    const email = 'usuario@exemplo.com'; // Email para notificação

    try {
        await uploadVideoAndNotify(videoPath, type, registerId, email);
    } catch (error) {
        console.error('[ERROR] Erro no upload:', error);
        process.exit(1);
    }
}

// Executar se for o módulo principal
main();