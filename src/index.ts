import { SQSClient, CreateQueueCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { promises as fs } from 'fs';
import path from 'path';

// Métodos de notificação externa (stubs para implementação futura)
async function notifyExternalSuccess(context: any) {
    // TODO: Implementar notificação de sucesso para sistema externo
    console.log('Notificação de sucesso enviada:', context);
}

async function notifyExternalError(context: any, error: any) {
    // TODO: Implementar notificação de erro para sistema externo
    console.error('Notificação de erro enviada:', context, error);
}

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
        await notifyExternalError({ step: 'createQueue' }, err);
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
                    if (savedVideoKey) {
                        try {
                            const fileBuffer = await downloadFromS3('poc-bucket', savedVideoKey);
                            if (!fileBuffer) throw new Error('Arquivo não encontrado no S3');
                            const tempDir = path.join(process.cwd(), 'tmp');
                            await fs.mkdir(tempDir, { recursive: true });
                            const filePath = path.join(tempDir, originalVideoName || savedVideoKey);
                            await fs.writeFile(filePath, fileBuffer);
                            console.log('Arquivo salvo em:', filePath);

                            // Processa frames e gera zip
                            const { spawn } = require('child_process');
                            const archiver = require('archiver');
                            const fsExtra = require('fs-extra');
                            const { v4: uuidv4 } = require('uuid');
                            const outputDir = path.join(process.cwd(), 'outputs');
                            await fsExtra.ensureDir(outputDir);
                            const id = uuidv4();
                            const tempFramesDir = path.join(tempDir, id);
                            await fsExtra.ensureDir(tempFramesDir);
                            const framePattern = path.join(tempFramesDir, 'frame_%04d.png');
                            await new Promise<void>((resolve, reject) => {
                                const ffmpeg = spawn('ffmpeg', [
                                    '-i', filePath,
                                    '-vf', 'fps=1',
                                    '-y',
                                    framePattern
                                ]);
                                ffmpeg.on('close', (code: number) => code === 0 ? resolve() : reject(new Error('Erro no ffmpeg')));
                            });
                            const frames: string[] = await fsExtra.readdir(tempFramesDir);
                            if (!frames.length) throw new Error('Nenhum frame extraído');
                            const zipName = `frames_${id}.zip`;
                            const zipPath = path.join(outputDir, zipName);
                            await new Promise<void>((resolve, reject) => {
                                const output = fsExtra.createWriteStream(zipPath);
                                const archive = archiver('zip');
                                output.on('close', resolve);
                                archive.on('error', reject);
                                archive.pipe(output);
                                frames.forEach((frame: string) => {
                                    archive.file(path.join(tempFramesDir, frame), { name: frame });
                                });
                                archive.finalize();
                            });
                            await fsExtra.remove(tempFramesDir);
                            await fsExtra.remove(filePath);
                            console.log('Zip gerado em:', zipPath);
                            // Notifica sucesso somente após o zip
                            await notifyExternalSuccess({
                                registerId,
                                savedVideoKey,
                                originalVideoName,
                                type,
                                zipPath
                            });
                        } catch (processErr) {
                            console.error('Erro ao processar vídeo:', processErr);
                            await notifyExternalError({
                                registerId,
                                savedVideoKey,
                                originalVideoName,
                                type
                            }, processErr);
                        }
                    }
                } catch (jsonErr) {
                    console.error('Erro ao fazer parse do corpo da mensagem:', jsonErr);
                    await notifyExternalError({ rawBody: msg.Body }, jsonErr);
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
        await notifyExternalError({ queueURL }, err);
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




