# Terraform Video Processor

Este diretório contém a configuração Terraform para o Video Processor.

## 📁 Estrutura:
```
terraform/
├── main.tf           # Configuração principal
└── README.md         # Este arquivo
```

## 🚀 Como usar:

### 1. Inicializar Terraform:
```bash
cd terraform
terraform init
```

### 2. Verificar o que será criado:
```bash
terraform plan
```

### 3. Criar recursos:
```bash
terraform apply
```

### 4. Ver outputs:
```bash
terraform output
```

## 📋 Recursos criados:

- **S3 Bucket**: `video-processor-storage-*`
- **SQS Queue**: `video-processing-queue`
- **SQS DLQ**: `video-processing-dlq`
- **ECS Task Definition**: `video-processor`
- **ECS Service**: `video-processor`
- **IAM Roles**: Para execução e permissões
- **Security Group**: Para rede ECS
- **CloudWatch Logs**: `/ecs/video-processor`

## ⚠️ Pré-requisitos:

- VPC: `appnet-vpc`
- Subnets: `appnet-public-*`
- ECS Cluster: `microservices-cluster`
- ECR Repository: `hacka-app-processor`

## 🎯 Outputs importantes:

- `s3_bucket_name`: Nome do bucket S3 criado
- `sqs_queue_url`: URL da fila SQS
- `ecs_service_name`: Nome do serviço ECS
