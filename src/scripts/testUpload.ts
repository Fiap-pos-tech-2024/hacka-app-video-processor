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
        console.log(`✅ Bucket "${BUCKET_NAME}" criado/verificado com sucesso`);
    } catch (error: any) {
        if (error.Code !== 'BucketAlreadyOwnedByYou' && error.Code !== 'BucketAlreadyExists') {
            console.error('❌ Erro ao criar bucket:', error);
            throw error;
        }
        console.log(`✅ Bucket "${BUCKET_NAME}" já existe`);
    }
}

async function uploadVideoAndNotify(filePath: string, type: string, registerId: string) {
    console.log('🚀 Iniciando upload e notificação...');
    
    // Verificar se o arquivo existe
    try {
        await fs.access(filePath);
    } catch (error) {
        console.error(`❌ Arquivo não encontrado: ${filePath}`);
        return;
    }

    // Criar bucket se não existir
    await createBucketIfNotExists();

    const fileName = path.basename(filePath);
    const fileBuffer = await fs.readFile(filePath);
    const savedVideoKey = `${Date.now()}_${fileName}`;

    console.log(`📤 Enviando arquivo para S3: ${fileName} -> ${savedVideoKey}`);

    // Upload para o S3
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: savedVideoKey,
        Body: fileBuffer,
    }));
    
    console.log('✅ Arquivo enviado ao S3:', savedVideoKey);

    // Monta mensagem para a fila
    const messageBody = JSON.stringify({
        registerId,
        savedVideoKey,
        originalVideoName: fileName,
        type,
    });

    console.log('📨 Enviando mensagem para a fila...');

    // Envia mensagem para a fila
    await sqsClient.send(new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: messageBody,
    }));
    
    console.log('✅ Mensagem enviada para a fila:', messageBody);
    console.log('🎬 Upload concluído! O vídeo será processado em breve.');
}

// Exemplo de uso
async function main() {
    const videoPath = path.join(process.cwd(), 'video', 'videoplayback.mp4');
    const type = 'test-video';
    const registerId = `test-${Date.now()}`;

    try {
        await uploadVideoAndNotify(videoPath, type, registerId);
    } catch (error) {
        console.error('❌ Erro no upload:', error);
        process.exit(1);
    }
}

// Executar se for o módulo principal
main();
