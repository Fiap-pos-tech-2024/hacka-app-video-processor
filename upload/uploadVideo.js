"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const client_sqs_1 = require("@aws-sdk/client-sqs");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
// Configurações
const BUCKET_NAME = 'poc-bucket'; // Substitua pelo nome real do bucket
const QUEUE_URL = 'http://localhost:4566/000000000000/video_processed';
const s3Client = new client_s3_1.S3Client({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566', // Altere se necessário
    forcePathStyle: true,
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
    },
});
const sqsClient = new client_sqs_1.SQSClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566', // Altere se necessário
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
    },
});
async function uploadVideoAndNotify(filePath, type, registerId) {
    const fileName = path_1.default.basename(filePath);
    const fileBuffer = await fs_1.promises.readFile(filePath);
    const savedVideoKey = `${Date.now()}_${fileName}`;
    // Upload para o S3
    await s3Client.send(new client_s3_1.PutObjectCommand({
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
    await sqsClient.send(new client_sqs_1.SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: messageBody,
    }));
    console.log('Mensagem enviada para a fila:', messageBody);
}
// Exemplo de uso:
// node uploadVideo.js ./meuvideo.mp4 tipo_video id_registro
if (require.main === module) {
    const [, , filePath, type, registerId] = process.argv;
    if (!filePath || !type || !registerId) {
        console.error('Uso: node uploadVideo.js <caminho_do_arquivo> <tipo> <registerId>');
        process.exit(1);
    }
    uploadVideoAndNotify(filePath, type, registerId).catch(console.error);
}
