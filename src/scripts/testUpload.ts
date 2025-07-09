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

async function uploadVideoAndNotify(filePath: string, type: string, registerId: string, user: { id: string; email: string; authorization: string }) {
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
    const registerId = `test-${Date.now()}`;
    const user = {
        id: '54c844b8-d061-70fd-af1a-f30728e48525',
        email: 'erik.fernandes87@gmail.com',
        authorization: 'Bearer eyJraWQiOiJyR05IZWRVS3JCR0NnR1haUTJuY3lNcnJvb3BVaDRDenNUSUVBNEorNnVVPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NGM4NDRiOC1kMDYxLTcwZmQtYWYxYS1mMzA3MjhlNDg1MjUiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9nYkJxSWM0VWgiLCJjbGllbnRfaWQiOiI2NzdpczRqMmU5cGd2amJzZDRzZDlya244YyIsIm9yaWdpbl9qdGkiOiJkOTliYjRkMi05NzczLTRjZjEtOGFhNS04NDlhZTYxMjQxOGQiLCJldmVudF9pZCI6ImIxNTM5M2UyLWUwZGUtNDUxZi04ZTA5LWYxMGU1MDQ0MDc5ZiIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4iLCJhdXRoX3RpbWUiOjE3NTIwOTk4NTMsImV4cCI6MTc1MjEwMzQ1MywiaWF0IjoxNzUyMDk5ODUzLCJqdGkiOiJjNGRmY2FjNC1iZmY5LTQ5ZTAtYTRjMC1kNzc4YWI2OGI4YmUiLCJ1c2VybmFtZSI6IjU0Yzg0NGI4LWQwNjEtNzBmZC1hZjFhLWYzMDcyOGU0ODUyNSJ9.U7688us_Rhnb-XxuSMDl80h6GOd98ukXb2bTYgX8Tv2A7Grtyb0RFtIGXk00SjIdrXr_E_Ou0-NQnbBur3HpBXXvdbAdObbwGH4XTiX3QjtD5OJUJUO67TGa2VZIVm0Spo6LnXpnNP_kfAccd3aXOJXPhoy1U2s_ypFOVwrqzq-LdENRj4DGM4Q8WdjewZNDwCApw6FDz0HkUqjILrJ2f37Y_ugNpc5_P9Z6ZWH1FqRf6y_zIwoBuLaEaFTgLYmoCwJPixwEAuE_69P1Nfz9aJA5Pjj87mcUx_zD71S3EMVwNrrGcSjQOV_NXWC5LWGZh2O5fccxwK8xziTOe_z2fA'
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