import { SQSClient, CreateQueueCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566',
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
    },
});

async function setupQueues() {
    console.log('[SETUP] Configurando filas no LocalStack...');
    
    const queues = [
        'video-processing-queue',
        'video_processed'
    ];
    
    for (const queueName of queues) {
        try {
            const result = await sqsClient.send(new CreateQueueCommand({
                QueueName: queueName,
            }));
            console.log(`[SUCCESS] Fila criada: ${queueName} -> ${result.QueueUrl}`);
        } catch (error: any) {
            if (error.Code === 'QueueAlreadyExists') {
                console.log(`[INFO] Fila já existe: ${queueName}`);
            } else {
                console.error(`[ERROR] Erro ao criar fila ${queueName}:`, error);
            }
        }
    }
    
    console.log('[COMPLETE] Configuração das filas concluída!');
}

setupQueues();
