import { SQSClient, CreateQueueCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { promises as fs } from 'fs';
import path from 'path';

async function createQueue(sqsClient: SQSClient) {
    const params = {
        QueueName: 'video_processed',
        Attributes: {
            VisibilityTimeout: '60',
        },
    };
    try {
        const data = await sqsClient.send(new CreateQueueCommand(params));
        console.log('Fila criada com sucesso:', data.QueueUrl);
        return data.QueueUrl;
    } catch (err) {
        console.error('Erro ao criar fila:', err);
    }
}

async function checkQueue(sqsClient: SQSClient, queueURL: string) {
    const params = {
        AttributeNames: ["All" as const],
        MaxNumberOfMessages: 10,
        MessageAttributeNames: ["All" as const],
        QueueUrl: queueURL,
        VisibilityTimeout: 20,
        WaitTimeSeconds: 0,
    };
    try {
        const data = await sqsClient.send(new ReceiveMessageCommand(params));
        if (data.Messages && data.Messages.length > 0) {
            for (const msg of data.Messages) {
                console.log('Mensagem recebida:', msg.Body);
                let videoData;
                try {
                    videoData = JSON.parse(msg.Body || '{}');
                    const { registerId, savedVideoKey, originalVideoName, type } = videoData;
                    console.log('Dados do vídeo para processamento:', videoData);
                    // Baixar arquivo do S3 se houver key
                    if (savedVideoKey) {
                        const fileBuffer = await downloadFromS3('poc-bucket', savedVideoKey);
                        if (fileBuffer) {
                            const tempDir = path.join(process.cwd(), 'tmp');
                            await fs.mkdir(tempDir, { recursive: true });
                            const filePath = path.join(tempDir, originalVideoName || savedVideoKey);
                            await fs.writeFile(filePath, fileBuffer);
                            console.log('Arquivo salvo em:', filePath);
                        }
                    }
                } catch (jsonErr) {
                    console.error('Erro ao fazer parse do corpo da mensagem:', jsonErr);
                }
                if (msg.ReceiptHandle) {
                    const deleteParams = {
                        QueueUrl: queueURL,
                        ReceiptHandle: msg.ReceiptHandle,
                    };
                    await sqsClient.send(new DeleteMessageCommand(deleteParams));
                    console.log('Message Deleted:', msg.MessageId);
                }
            }
        } else {
            console.log('Nenhuma mensagem encontrada na fila.');
        }
    } catch (err) {
        console.error('Receive Error', err);
    }
}

// Configuração do S3Client
const s3Client = new S3Client({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566', // Agora usando a porta correta do S3 local
    forcePathStyle: true, // Necessário para LocalStack
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
    },
});

async function downloadFromS3(bucket: string, key: string): Promise<Buffer | undefined> {
    const params = {
        Bucket: bucket,
        Key: key,
    };
    try {
        const data = await s3Client.send(new GetObjectCommand(params));
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
        }
    } catch (err) {
        console.error('Erro ao baixar arquivo do S3:', err);
    }
}

async function main() {
    const sqsClient = new SQSClient({
        region: 'us-east-1',
        endpoint: 'http://localhost:4566', // Atualizado para a porta correta do SQS local
        credentials: {
            accessKeyId: 'test',
            secretAccessKey: 'test',
        },
    });
    const queueURL = await createQueue(sqsClient);
    
    if (!queueURL) {
        console.error('Queue URL is undefined. Exiting.');
        return;
    }
    // Checa a fila a cada 20 segundos
    setInterval(() => checkQueue(sqsClient, queueURL), 20000);
    // Checa imediatamente ao iniciar
    await checkQueue(sqsClient, queueURL);
}

main();




