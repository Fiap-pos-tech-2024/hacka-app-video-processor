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
        console.log(`Bucket "${BUCKET_NAME}" criado/verificado com sucesso`);
    } catch (error: any) {
        if (error.Code !== 'BucketAlreadyOwnedByYou' && error.Code !== 'BucketAlreadyExists') {
            console.error('Erro ao criar bucket:', error);
            throw error;
        }
        console.log(`Bucket "${BUCKET_NAME}" já existe`);
    }
}

async function uploadVideoAndNotify(filePath: string, type: string, registerId: string, user: { id: string; email: string; authorization: string }) {
    console.log('Iniciando upload e notificação...');
    
    // Validar dados de entrada
    if (!user.id || !user.email || !user.authorization) {
        throw new Error('Dados de usuário incompletos. ID, email e autorização são obrigatórios.');
    }
    
    if (!registerId || !type) {
        throw new Error('ID de registro e tipo são obrigatórios.');
    }
    
    // Mostrar URLs de configuração
    console.log('URLs de configuração:');
    console.log(`S3 Endpoint: ${s3Client.config.endpoint}`);
    console.log(`Bucket Name: ${BUCKET_NAME}`);
    console.log(`SQS Queue URL: ${QUEUE_URL}`);
    console.log(`S3 Bucket URL: http://localhost:4566/${BUCKET_NAME}`);
    
    // Mostrar dados do usuário (sem o token completo por segurança)
    console.log('Dados do usuário:');
    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Token presente: ${user.authorization ? 'Sim' : 'Não'}`);
    console.log(`Register ID: ${registerId}`);
    console.log(`Tipo: ${type}`);
    
    // Verificar se o arquivo existe
    try {
        await fs.access(filePath);
    } catch (error) {
        console.error(`Arquivo não encontrado: ${filePath}`);
        return;
    }

    // Criar bucket se não existir
    await createBucketIfNotExists();

    const fileName = path.basename(filePath);
    const fileBuffer = await fs.readFile(filePath);
    const savedVideoKey = `${Date.now()}_${fileName}`;

    console.log(`Enviando arquivo para S3: ${fileName} -> ${savedVideoKey}`);
    console.log(`URL do objeto no S3: http://localhost:4566/${BUCKET_NAME}/${savedVideoKey}`);
    console.log(`Caminho completo do arquivo: ${filePath}`);
    console.log(`Tamanho do arquivo: ${fileBuffer.length} bytes`);

    // Upload para o S3
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: savedVideoKey,
        Body: fileBuffer,
    }));
    
    console.log('Arquivo enviado ao S3:', savedVideoKey);

    // Monta mensagem para a fila
    const messageData = {
        registerId,
        savedVideoKey,
        originalVideoName: fileName,
        type,
        user: {
            id: user.id,
            email: user.email,
            authorization: user.authorization,
        },
    };

    const messageBody = JSON.stringify(messageData);

    console.log('Enviando mensagem para a fila...');
    console.log('Dados da mensagem:', {
        registerId: messageData.registerId,
        savedVideoKey: messageData.savedVideoKey,
        originalVideoName: messageData.originalVideoName,
        type: messageData.type,
        user: {
            id: messageData.user.id,
            email: messageData.user.email,
            authorization: messageData.user.authorization ? '[TOKEN_PRESENTE]' : undefined
        }
    });

    // Envia mensagem para a fila
    await sqsClient.send(new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: messageBody,
    }));
    
    console.log('Mensagem enviada para a fila com sucesso!');
    console.log('✅ Upload concluído! O vídeo será processado em breve.');
    console.log(`📁 Arquivo S3: ${savedVideoKey}`);
    console.log(`🆔 Register ID: ${registerId}`);
    console.log(`👤 Usuário: ${user.email} (ID: ${user.id})`);
    console.log(`📋 Tipo: ${type}`);
}

// Função para obter dados de teste do usuário a partir de variáveis de ambiente
function getTestUserData() {
    return {
        id: process.env.TEST_USER_ID || 'test-user-id',
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        authorization: process.env.TEST_USER_TOKEN || 'Bearer test-token'
    };
}

// Exemplo de uso
async function main() {
    const videoPath = path.join(process.cwd(), 'video', 'videoplayback.mp4');
    const type = 'test-video';
    const registerId = '1'; // ID que será usado na URL da API do microserviço
    
    // Obter dados do usuário de variáveis de ambiente ou usar valores padrão para teste
    const user = getTestUserData();
    
    console.log('⚠️  AVISO: Para usar dados reais, configure as variáveis de ambiente:');
    console.log('   TEST_USER_ID, TEST_USER_EMAIL, TEST_USER_TOKEN');
    console.log('');

    try {
        await uploadVideoAndNotify(videoPath, type, registerId, user);
    } catch (error) {
        console.error('Erro no upload:', error);
        process.exit(1);
    }
}

// Executar se for o módulo principal
main();