# 🎬 Exemplo Prático - Como Testar o Video Processor

## 📋 Pré-requisitos
1. Vídeo deve estar no bucket S3: `video-processor-storage-eemubqtc`
2. AWS CLI configurado
3. SQS Queue URL: `https://sqs.us-east-1.amazonaws.com/497986631333/video-processing-queue`

## 🚀 Teste Rápido via AWS CLI

### 1. Upload do vídeo para S3 (se ainda não estiver):
```bash
aws s3 cp meu-video.mp4 s3://video-processor-storage-eemubqtc/meu-video.mp4
```

### 2. Enviar mensagem para processamento:
```bash
aws sqs send-message \
  --queue-url "https://sqs.us-east-1.amazonaws.com/497986631333/video-processing-queue" \
  --message-body '{
    "registerId": "test-001",
    "savedVideoKey": "meu-video.mp4",
    "originalVideoName": "video-original.mp4",
    "type": "frame-extraction",
    "email": "teste@exemplo.com"
  }'
```

### 3. Verificar logs de processamento:
```bash
aws logs tail /ecs/video-processor --follow
```

## 🔍 Estrutura do Payload

### Campos obrigatórios:
- **`registerId`**: ID único do registro (string)
- **`savedVideoKey`**: Nome do arquivo no S3 (string)
- **`originalVideoName`**: Nome original do arquivo (string)
- **`type`**: Tipo de processamento - usar `"frame-extraction"` (string)

### Campos opcionais:
- **`email`**: Email para notificação (string, opcional)

## 📤 Exemplo em JavaScript/Node.js

```javascript
const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ region: 'us-east-1' });

async function processVideo(videoFileName, userEmail) {
  const message = {
    registerId: `reg-${Date.now()}`,
    savedVideoKey: videoFileName,
    originalVideoName: videoFileName,
    type: 'frame-extraction',
    email: userEmail
  };

  const params = {
    QueueUrl: 'https://sqs.us-east-1.amazonaws.com/497986631333/video-processing-queue',
    MessageBody: JSON.stringify(message)
  };

  try {
    const result = await sqs.sendMessage(params).promise();
    console.log('✅ Vídeo enviado para processamento:', result.MessageId);
    return result.MessageId;
  } catch (error) {
    console.error('❌ Erro ao enviar:', error);
    throw error;
  }
}

// Uso:
processVideo('meu-video.mp4', 'usuario@exemplo.com');
```

## 🔄 Fluxo de Processamento

1. **Upload**: Vídeo é salvo no S3
2. **Queue**: Mensagem é enviada para SQS
3. **Processing**: Container ECS processa o vídeo
4. **Output**: Frames são extraídos e salvos como ZIP
5. **Notification**: Email é enviado (se fornecido)

## 📊 Monitoramento

### CloudWatch Logs:
```bash
aws logs describe-log-groups --log-group-name-prefix "/ecs/video-processor"
```

### Status do ECS:
```bash
aws ecs describe-services --cluster microservices-cluster --services video-processor
```

### Mensagens na fila:
```bash
aws sqs get-queue-attributes --queue-url "https://sqs.us-east-1.amazonaws.com/497986631333/video-processing-queue" --attribute-names All
```

## 🚨 **ATENÇÃO: INFRAESTRUTURA DESTRUÍDA**

⚠️ **A infraestrutura AWS deste projeto foi completamente destruída em 06/07/2025 para evitar cobranças.**

Todos os recursos foram removidos:
- ✅ ECS Services e Clusters
- ✅ Application Load Balancer
- ✅ Buckets S3 (processor-video, terraform-states)
- ✅ Filas SQS
- ✅ User Pools do Cognito
- ✅ VPC e recursos de rede
- ✅ Roles e políticas IAM

Para reativar o projeto, execute:
```bash
# No diretório terraform-orchestration-video
./apply-all.sh
```

## ⚠️ Troubleshooting (quando infraestrutura estiver ativa)

### Container não processa:
1. Verificar se o vídeo existe no S3
2. Verificar formato do JSON na mensagem SQS
3. Verificar logs do CloudWatch

### Vídeo não encontrado:
```bash
aws s3 ls s3://video-processor-storage-eemubqtc/
```

### Mensagem com erro:
- Verificar se `savedVideoKey` corresponde ao arquivo no S3
- Verificar se JSON está válido
- Verificar se `type` é `"frame-extraction"`

## 🎯 Resultado Esperado

Após o processamento:
- ZIP com frames será salvo no S3: `frames_[registerId].zip`
- Logs aparecerão no CloudWatch
- Email de notificação será enviado (se fornecido)
