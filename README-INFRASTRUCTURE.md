# Video Processor Infrastructure - Quick Start Guide

Este script automatiza o deploy e destroy completo da infraestrutura AWS para o projeto de processamento de vídeos.

## 🚀 Como usar

### 1. Deploy completo da infraestrutura
```powershell
.\deploy-infrastructure.ps1 deploy
```

### 2. Verificar status dos serviços
```powershell
.\deploy-infrastructure.ps1 status
```

### 3. Destruir toda a infraestrutura
```powershell
.\deploy-infrastructure.ps1 destroy
```

## 📋 Pré-requisitos

- Docker Desktop rodando
- AWS CLI configurado (`aws configure`)
- Terraform instalado
- PowerShell 5.1 ou superior

## 🏗️ O que o script faz

### Deploy:
1. 🐳 Build e push da imagem Docker para Docker Hub
2. 🏗️ Executa Terraform em todos os módulos na ordem correta:
   - terraform-backend (S3 state)
   - terraform-network (VPC, subnets)
   - terraform-cognito (User pools)
   - terraform-user-db (RDS)
   - terraform-alb (Application Load Balancer)
   - terraform-github-oidc (CI/CD)
   - terraform-video-auth-service (Auth service)
   - terraform-notification-service (Notifications)
   - terraform-video-processor (Video processor)
   - terraform-monitoring-grafana-alloy (Monitoring)

### Destroy:
1. 🔥 Destroi todos os recursos na ordem reversa
2. ⚠️ **ATENÇÃO**: Isso remove TUDO da AWS!

## 📤 Como integrar com sua aplicação

Após o deploy bem-sucedido, use as informações mostradas pelo script:

### SQS Queue URL:
```
https://sqs.us-east-1.amazonaws.com/[ACCOUNT]/video-processing-queue
```

### Payload para envio:
```json
{
  "registerId": "registro-123",
  "savedVideoKey": "nome-do-video.mp4",
  "originalVideoName": "video-original.mp4",
  "type": "frame-extraction",
  "email": "usuario@exemplo.com"
}
```

### Exemplo com AWS SDK:
```javascript
const AWS = require('aws-sdk');
const sqs = new AWS.SQS({region: 'us-east-1'});

const params = {
  QueueUrl: 'https://sqs.us-east-1.amazonaws.com/[ACCOUNT]/video-processing-queue',
  MessageBody: JSON.stringify({
    registerId: 'reg-123',
    savedVideoKey: 'meu-video.mp4',
    originalVideoName: 'video-original.mp4',
    type: 'frame-extraction',
    email: 'usuario@exemplo.com'
  })
};

sqs.sendMessage(params, (err, data) => {
  if (err) console.error(err);
  else console.log('Mensagem enviada:', data.MessageId);
});
```

## 🔍 Monitoramento

- **CloudWatch Logs**: `/ecs/video-processor`
- **ECS Services**: Console AWS → ECS → microservices-cluster
- **SQS**: Console AWS → SQS → video-processing-queue

## ⚠️ Custos AWS

### Serviços que geram custos:
- ECS Fargate (containers rodando)
- ALB (Application Load Balancer)
- RDS (banco de dados)
- S3 (armazenamento)
- CloudWatch (logs)

### Para evitar custos:
```powershell
.\deploy-infrastructure.ps1 destroy
```

## 🛠️ Troubleshooting

### Container não inicia:
1. Verificar logs: `.\deploy-infrastructure.ps1 status`
2. Verificar CloudWatch Logs
3. Verificar se a imagem Docker foi enviada corretamente

### SQS não processa:
1. Verificar se o vídeo está no bucket S3
2. Verificar payload JSON
3. Verificar logs do container

### Erro de permissões:
1. Verificar `aws configure`
2. Verificar se o usuário tem permissões administrativas

## 📞 Suporte

Para problemas:
1. Verificar logs no CloudWatch
2. Executar `.\deploy-infrastructure.ps1 status`
3. Verificar recursos no Console AWS
