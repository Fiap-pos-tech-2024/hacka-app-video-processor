# 🔐 Configurar Credenciais AWS

## 📋 Onde conseguir credenciais AWS:

### 1️⃣ **AWS Console → IAM → Users**
1. Vá para AWS Console
2. Procure por "IAM"
3. Menu lateral → "Users" 
4. Clique no seu usuário
5. Aba "Security credentials"
6. Clique "Create access key"

### 2️⃣ **Tipos de credenciais:**
- **Access Key ID**: AKIA... (público)
- **Secret Access Key**: (privado - só aparece uma vez)

### 3️⃣ **Como configurar:**

#### PowerShell:
```powershell
aws configure set aws_access_key_id "SUA_ACCESS_KEY"
aws configure set aws_secret_access_key "SUA_SECRET_KEY"
aws configure set default.region "us-east-1"
aws configure set default.output "json"
```

#### Ou interativo:
```powershell
aws configure
```

### 4️⃣ **Testar configuração:**
```powershell
aws sts get-caller-identity
```

### 5️⃣ **Executar Terraform:**
```powershell
cd terraform
terraform init
terraform plan
terraform apply
```

## ⚠️ **IMPORTANTE:**
- **NUNCA** compartilhe suas credenciais
- **Use IAM User** com permissões mínimas necessárias
- **Delete credenciais antigas** se não usar mais

## 🎯 **Permissões necessárias para o usuário IAM:**
- `AmazonS3FullAccess`
- `AmazonSQSFullAccess` 
- `AmazonECS_FullAccess`
- `IAMFullAccess`
- `CloudWatchLogsFullAccess`
- `EC2FullAccess` (para VPC/Subnets)
