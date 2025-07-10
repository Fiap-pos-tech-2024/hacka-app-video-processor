# 🎬 Video Processing Service

> Serviço de processamento de vídeos com arquitetura hexagonal que monitora fila SQS, processa vídeos do S3 e extrai frames usando FFmpeg.

## 🚀 DEPLOY PARA PRODUÇÃO AWS

### ⚡ Configuração Rápida

1. **Copie o arquivo de produção:**
   ```bash
   cp .env.production .env
   ```

2. **Build e deploy:**
   ```bash
   docker build -t video-processor .
   docker run --env-file .env video-processor
   ```

3. **Pronto!** ✅ A aplicação conectará automaticamente em:
   - 📥 **SQS**: `https://sqs.us-east-1.amazonaws.com/816069165502/video-processing-queue`
   - 📦 **S3**: `fiap-video-bucket-20250706`
   - 🔔 **APIs**: Configuradas automaticamente

### 🔧 Configurações AWS Necessárias

- ✅ **IAM Role** com permissões para SQS e S3
- ✅ **SQS Queue**: `video-processing-queue` criada
- ✅ **S3 Bucket**: `fiap-video-bucket-20250706` criado
- ✅ **Security Groups** permitindo tráfego HTTPS para APIs

📋 **Veja detalhes completos em**: [`AWS_DEPLOYMENT.md`](./AWS_DEPLOYMENT.md)

---

## 🚀 Desenvolvimento Local

### Pré-requisitos

- **Node.js** (versão 18+)
- **Docker** e **Docker Compose**
- **FFmpeg** instalado e no PATH

### Instalação

```bash
# Clone o projeto
git clone <url-do-repositorio>
cd hacka-app-processor

# Instale as dependências
npm install

# Inicie o LocalStack (AWS local)
docker-compose up localstack -d

# Compile o projeto
npm run build
```

### Execução

```bash
# Executar em produção (inicia servidor HTTP na porta 3000)
npm start

# Executar em desenvolvimento (com watch)
npm run dev

# Testar upload de vídeo (configurar variáveis de ambiente antes)
npm run test-upload
```

**Nota**: A aplicação iniciará um servidor HTTP na porta 3000 (ou na porta definida pela variável de ambiente `PORT`) com as seguintes rotas:
- `GET /health` - Health check completo
- `GET /ping` - Verificação simples
- `GET /info` - Informações da aplicação

### 🔧 Configuração do Script de Teste

Para testar o upload de vídeo, configure as seguintes variáveis de ambiente:

```bash
# Windows PowerShell
$env:TEST_USER_ID="seu-user-id"
$env:TEST_USER_EMAIL="seu-email@exemplo.com"
$env:TEST_USER_TOKEN="Bearer seu-jwt-token"

# Linux/Mac
export TEST_USER_ID="seu-user-id"
export TEST_USER_EMAIL="seu-email@exemplo.com"
export TEST_USER_TOKEN="Bearer seu-jwt-token"

# Em seguida execute o teste
npm run test-upload
```

**Nota de Segurança**: ⚠️ Nunca commite tokens JWT reais no código. Use sempre variáveis de ambiente para dados sensíveis.

## 📁 Estrutura do Projeto

```
src/
├── domain/              # Lógica de negócio
│   ├── entities/        # Entidades do domínio
│   ├── ports/          # Interfaces (contratos)
│   └── useCases/       # Casos de uso
├── infrastructure/      # Adaptadores externos
│   ├── adapters/       # Implementações dos ports
│   ├── config/         # Configurações
│   └── factories/      # Injeção de dependência
├── application/        # Serviços de aplicação
└── scripts/           # Scripts utilitários
```

Você verá:
```
🎬 Iniciando aplicação de processamento de vídeos...
🚀 Iniciando serviço de processamento de vídeos...
✅ Fila configurada: http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/video_processed
🔄 Verificando mensagens a cada 20000ms
```

#### 2. Em Outro Terminal, Faça o Upload de Teste

```bash
# Execute o script de upload (isso enviará um vídeo para processamento)
npm run test-upload
```

Você verá:
```
🚀 Iniciando upload e notificação...
✅ Bucket "poc-bucket" criado/verificado com sucesso
📤 Enviando arquivo para S3: videoplayback.mp4 -> 1234567890_videoplayback.mp4
✅ Arquivo enviado ao S3: 1234567890_videoplayback.mp4
📨 Enviando mensagem para a fila...
✅ Mensagem enviada para a fila
🎬 Upload concluído! O vídeo será processado em breve.
```

#### 3. Acompanhe o Processamento

No terminal do serviço principal, você verá:
```
Dados do vídeo para processamento: { registerId: 'test-xxx', ... }
Arquivo baixado do S3: 1234567890_videoplayback.mp4
Arquivo salvo em: C:\...\tmp\videoplaybook.mp4
ZIP criado: C:\...\outputs\frames_xxx.zip (1181601 bytes)
✅ Processamento concluído com sucesso
```

### Execução em Desenvolvimento

```bash
# Modo desenvolvimento com hot-reload
npm run dev
```

## 📁 Estrutura de Arquivos Gerados

```
base-hexa/
├── tmp/                     # 📁 Arquivos temporários (limpos automaticamente)
├── outputs/                 # 📦 Arquivos ZIP com frames extraídos
├── dist/                    # 🏗️ Código TypeScript compilado
└── logs/                    # 📝 Logs da aplicação (se configurado)
```

## 🔧 Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| **Compilar** | `npm run build` | Compila TypeScript para JavaScript na pasta `dist/` |
| **Iniciar** | `npm start` | Inicia o serviço de processamento de vídeos |
| **Desenvolvimento** | `npm run dev` | Modo desenvolvimento com hot-reload |
| **Teste Upload** | `npm run test-upload` | Faz upload de um vídeo de teste e envia para processamento |
## 🏥 Health Check e Monitoramento

O sistema agora inclui rotas HTTP para monitoramento e health check:

### 📊 Rota de Health Check
```bash
GET http://localhost:3000/health
```

**Resposta de exemplo:**
```json
{
  "status": "healthy", // ou "unhealthy"
  "timestamp": "2025-07-10T17:56:42.340Z",
  "services": {
    "sqs": {
      "status": "up", // "up", "down" ou "unknown"
      "lastCheck": "2025-07-10T17:56:42.977Z"
    },
    "s3": {
      "status": "up",
      "lastCheck": "2025-07-10T17:56:42.340Z"
    },
    "ffmpeg": {
      "status": "up", 
      "lastCheck": "2025-07-10T17:56:42.343Z"
    }
  },
  "uptime": 11, // tempo em segundos desde o início
  "application": {
    "name": "Video Processing Service",
    "version": "1.0.0",
    "environment": "development"
  }
}
```

**Status Codes:**
- `200` - Sistema saudável
- `503` - Sistema não saudável (um ou mais serviços com problemas)
- `500` - Erro interno durante verificação

### 🏓 Outras Rotas Disponíveis

#### Ping
```bash
GET http://localhost:3000/ping
```
Resposta simples para verificar se o servidor está respondendo.

#### Informações da Aplicação
```bash
GET http://localhost:3000/info
```
Retorna informações básicas sobre a aplicação.

### 🚀 Iniciando com Health Check

Quando você iniciar a aplicação:

```bash
npm start
```

Você verá:
```
🎬 Iniciando aplicação de processamento de vídeos...
📋 Configurações de Produção:
   - Região AWS: us-east-1
   - Bucket S3: fiap-video-bucket-20250706
   - Fila SQS: https://sqs.us-east-1.amazonaws.com/816069165502/video-processing-queue
   - Porta HTTP: 3000
   - Ambiente: production
🌐 Servidor HTTP iniciado na porta 3000
📊 Health check disponível em: http://localhost:3000/health
📋 Info da aplicação em: http://localhost:3000/info
```

## 🔧 Como Funciona

1. **Monitoramento**: O serviço monitora continuamente a fila SQS `video_processed`
2. **Download**: Quando uma mensagem é recebida, baixa o vídeo do S3
3. **Processamento**: Extrai frames do vídeo usando FFmpeg
4. **Compressão**: Gera um arquivo ZIP com todos os frames
5. **Upload**: Faz upload do ZIP para o S3
6. **Limpeza**: Remove arquivos temporários

## 🧪 Testando

```bash
# 1. Inicie o serviço (em um terminal)
npm start

# 2. Execute o teste de upload (em outro terminal)
npm run test-upload
```

O teste irá:
- Fazer upload do vídeo `video/videoplaybook.mp4` para o S3
- Enviar uma mensagem para a fila SQS
- O serviço processará automaticamente o vídeo

## 📝 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run build` | Compila TypeScript para JavaScript |
| `npm start` | Executa o serviço em produção |
| `npm run dev` | Executa em modo desenvolvimento com hot-reload |
| `npm run test-upload` | Testa o upload de vídeo |

## 🏗️ Arquitetura Hexagonal

Este projeto implementa **Arquitetura Hexagonal** (Ports and Adapters):

- **Domain**: Lógica de negócio pura, independente de frameworks
- **Ports**: Interfaces que definem contratos
- **Adapters**: Implementações específicas (AWS, FFmpeg, etc.)
- **Application**: Orquestração entre domínio e infraestrutura

## 📋 Pré-requisitos de Sistema

- Node.js 18+
- FFmpeg no PATH
- Docker e Docker Compose
- ~2GB de espaço livre (para vídeos e frames temporários)

## 🚀 Deploy

Para deploy em produção:

1. Configure as credenciais AWS reais
2. Altere o endpoint em `AppConfig.ts`
3. Configure as variáveis de ambiente
4. Execute `npm run build && npm start`

```bash
cd hacka-app-processor
npm run build
docker build -t maickway/video-processor:latest .
docker push maickway/video-processor:latest
```