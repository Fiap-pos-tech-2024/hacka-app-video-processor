import { S3Client, PutObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import 'dotenv/config';

const BASE_PATH_AUTH = process.env.BASE_PATH_AUTH || 'http://localhost:3000/api/auth';
const BUCKET_NAME = process.env.BUCKET_NAME || 'fiap-video-bucket-20250706';
const QUEUE_URL = process.env.QUEUE_URL || 'http://localhost:4566/000000000000/video_processed';

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

const testUser = {
  email: 'erik.fernandes87@gmail.com',
  senhaTemporaria: 'Senha123!',
  novaSenha: 'MinhaSenhaNova123!',
  nome: 'Erik Amaral',
  cpf: '34058799811'
};

async function getAccessToken(): Promise<string> {
  try {
    await fetch(`${BASE_PATH_AUTH}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        senha: testUser.senhaTemporaria,
        nome: testUser.nome,
        cpf: testUser.cpf,
      })
    });

    const response = await fetch(`${BASE_PATH_AUTH}/confirmar-senha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        senhaTemporaria: testUser.senhaTemporaria,
        novaSenha: testUser.novaSenha
      })
    });

    const json = await response.json();

    if (!json.tokens?.AccessToken) {
      throw new Error('Token não retornado pela API');
    }

    return `Bearer ${json.tokens.AccessToken}`;
  } catch (err) {
    console.error('❌ Erro ao obter token de autenticação:', err);
    throw err;
  }
}

async function createBucketIfNotExists() {
  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`✅ Bucket "${BUCKET_NAME}" criado com sucesso`);
  } catch (error: any) {
    if (error.Code !== 'BucketAlreadyOwnedByYou' && error.Code !== 'BucketAlreadyExists') {
      console.error('❌ Erro ao criar bucket:', error);
      throw error;
    }
    console.log(`ℹ️ Bucket "${BUCKET_NAME}" já existe`);
  }
}

async function uploadVideoAndNotify(filePath: string, type: string, registerId: string, token: string) {
  const fileName = path.basename(filePath);
  const fileBuffer = await fs.readFile(filePath);
  const savedVideoKey = `${Date.now()}_${fileName}`;

  await createBucketIfNotExists();

  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: savedVideoKey,
    Body: fileBuffer,
  }));

  const messageData = {
    registerId,
    savedVideoKey,
    originalVideoName: fileName,
    type,
    user: {
      id: 'test-user-id',
      email: testUser.email,
      authorization: token,
    },
  };

  await sqsClient.send(new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(messageData),
  }));

  console.log('✅ Upload e envio para fila concluídos com sucesso!');
  console.log(`📦 Arquivo: ${savedVideoKey}`);
  console.log(`📨 Fila: ${QUEUE_URL}`);
}

async function main() {
  try {
    const token = await getAccessToken();
    const videoPath = path.join(process.cwd(), 'video', 'videoplayback.mp4');
    await uploadVideoAndNotify(videoPath, 'test-video', '1', token);
  } catch (error) {
    console.error('❌ Erro no processo:', error);
    process.exit(1);
  }
}

main();
