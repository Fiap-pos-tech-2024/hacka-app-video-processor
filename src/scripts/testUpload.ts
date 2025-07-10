import { S3Client, PutObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';   
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { promises as fs } from 'fs';
import path from 'path';

// Configurações
const BUCKET_NAME = 'fiap-video-bucket-20250706';
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

async function uploadVideoAndNotify(filePath: string, type: string, registerId: string, user: { id: string; email: string; authorization: string }) {
    console.log('🚀 Iniciando upload e notificação...');
    
    // Mostrar URLs de configuração
    console.log('🔗 URLs de configuração:');
    console.log(`   📍 S3 Endpoint: ${s3Client.config.endpoint}`);
    console.log(`   🪣 Bucket Name: ${BUCKET_NAME}`);
    console.log(`   📬 SQS Queue URL: ${QUEUE_URL}`);
    console.log(`   🌐 S3 Bucket URL: http://localhost:4566/${BUCKET_NAME}`);
    
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
    console.log(`🔗 URL do objeto no S3: http://localhost:4566/${BUCKET_NAME}/${savedVideoKey}`);
    console.log(`📋 Caminho completo do arquivo: ${filePath}`);
    console.log(`📊 Tamanho do arquivo: ${fileBuffer.length} bytes`);

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
        user: {
            id: user.id,
            email: user.email,
            authorization: user.authorization,
        },
    });

    console.log('📨 Enviando mensagem para a fila...');
    console.log('�📋 Dados da mensagem:', JSON.parse(messageBody));

    // Envia mensagem para a fila
    await sqsClient.send(new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: messageBody,
    }));
    
    console.log('✅ Mensagem enviada para a fila com sucesso!');
    console.log('🎬 Upload concluído! O vídeo será processado em breve.');
}

// Exemplo de uso
async function main() {
    const videoPath = path.join(process.cwd(), 'video', 'videoplayback.mp4');
    const type = 'test-video';
    const registerId = '1'; // ID que será usado na URL da API do microserviço
    const user = {
        id: '54c844b8-d061-70fd-af1a-f30728e48525',
        email: 'erik.fernandes87@gmail.com',
        authorization: 'Bearer eyJraWQiOiJyR05IZWRVS3JCR0NnR1haUTJuY3lNcnJvb3BVaDRDenNUSUVBNEorNnVVPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NGM4NDRiOC1kMDYxLTcwZmQtYWYxYS1mMzA3MjhlNDg1MjUiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9nYkJxSWM0VWgiLCJjbGllbnRfaWQiOiI2NzdpczRqMmU5cGd2amJzZDRzZDlya244YyIsIm9yaWdpbl9qdGkiOiIxYTZkMmQ4NS04NmMxLTRiM2EtYWI5Ny1mMjM1NGYzYzQwYzciLCJldmVudF9pZCI6ImYwOGM1ZWQ0LWVkY2YtNDg3MC1hMDdkLTUxNDE4ODY1ODA0YyIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4iLCJhdXRoX3RpbWUiOjE3NTIxMDQxNTgsImV4cCI6MTc1MjEwNzc1OCwiaWF0IjoxNzUyMTA0MTU4LCJqdGkiOiI4ZmZkYzhjYy1iZGJiLTQ3MGUtOGRmZC1iZmFmYmUyZTQzMGMiLCJ1c2VybmFtZSI6IjU0Yzg0NGI4LWQwNjEtNzBmZC1hZjFhLWYzMDcyOGU0ODUyNSJ9.BvKQWxFIxh4IMP9AkAJ1nSJLhxUdwWxRch-Y8Ay2hf8DwJKs_zll16vzXFqtvadSp10eeE7BeEM265N6DqbbW2d8MFqMD-mDSUZwDwc_Cj2W_X4rnoBkaOJHf8_j5q230qytQ8oRKu9DLvmHKk834tF4jdf1-iSaEv2WC12g1po2_YAPQUPoU_kLbZEJERfUzDMIvGbeAdrk6KhQJsexx_wWb7PhFmHmJqprkKdx18oJBc_kUWLTzteYXfTsjILSFD2fzP8Z9BENfMBXVOax-4eFKlJ9sKbui_UW8vrLprd_ul0xGrWN9_z5JazmKSr_8jvjAqM1V6SqMVwq1Y0J_w'
    };

    try {
        await uploadVideoAndNotify(videoPath, type, registerId, user);
    } catch (error) {
        console.error('❌ Erro no upload:', error);
        process.exit(1);
    }
}

// Executar se for o módulo principal
main();