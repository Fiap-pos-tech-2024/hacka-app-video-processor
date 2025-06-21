# 🎬 Video Processing Service - Arquitetura Hexagonal

Um serviço de processamento de vídeos construído com **Arquitetura Hexagonal**, que monitora uma fila SQS, baixa vídeos do S3, extrai frames usando FFmpeg e gera arquivos ZIP com os frames extraídos.

## Arquitetura

Este projeto implementa a **Arquitetura Hexagonal (Ports and Adapters)**: 

### Estrutura do Projeto

```
src/
├── domain/                    # 🎯 Núcleo da aplicação (Domínio)
│   ├── entities/             # Entidades de domínio
│   │   ├── VideoProcessing.ts
│   │   └── QueueMessage.ts
│   ├── ports/                # 🔌 Interfaces (Portas)
│   │   ├── QueuePort.ts
│   │   ├── StoragePort.ts
│   │   ├── FileSystemPort.ts
│   │   ├── VideoProcessorPort.ts
│   │   └── NotificationPort.ts
│   └── useCases/             # 📋 Casos de uso (Lógica de negócio)
│       ├── ProcessVideoUseCase.ts
│       └── CreateQueueUseCase.ts
├── infrastructure/           # 🔧 Camada externa (Infraestrutura)
│   ├── adapters/            # Adaptadores (implementam as portas)
│   │   ├── AWSSQSAdapter.ts
│   │   ├── AWSS3Adapter.ts
│   │   ├── NodeFileSystemAdapter.ts
│   │   ├── FFmpegVideoProcessor.ts
│   │   └── ConsoleNotificationAdapter.ts
│   ├── config/
│   │   └── AppConfig.ts
│   └── factories/
│       └── DependencyFactory.ts
├── application/             # 🚀 Camada de aplicação
│   └── services/
│       └── VideoProcessingService.ts
├── scripts/
│   └── testUpload.ts       # Script de teste para upload
└── index.ts                # 🎯 Ponto de entrada
```

## 🛠️ Pré-requisitos

### Software Necessário

1. **Node.js** (versão 18 ou superior)
   ```bash
   # Verificar versão
   node --version
   ```

2. **FFmpeg** (para extração de frames)
   - **Windows**: Baixar de [ffmpeg.org](https://ffmpeg.org/download.html) e adicionar ao PATH
   - **macOS**: `brew install ffmpeg`
   - **Linux**: `sudo apt install ffmpeg`
   
   ```bash
   # Verificar instalação
   ffmpeg -version
   ```

3. **Docker** (para LocalStack)
   ```bash
   # Verificar instalação
   docker --version
   docker-compose --version
   ```

### Arquivos Necessários

- Coloque um arquivo de vídeo de teste na pasta `video/` com o nome `videoplayback.mp4`

## 🚀 Instalação e Configuração

### 1. Clone e Configure o Projeto

```bash
# Clone o repositório (ou baixe os arquivos)
cd  hacka-app-video-processor

# Instale as dependências
npm install
```

### 2. Inicie o LocalStack (AWS Local)

```bash
# Inicie os serviços AWS locais
docker-compose up -d

# Verifique se está rodando
docker-compose ps
```

O LocalStack irá expor:
- **S3**: `http://localhost:4566`
- **SQS**: `http://localhost:4566`

### 3. Compile o Projeto

```bash
# Compile o TypeScript para JavaScript
npm run build
```

Os arquivos compilados ficarão na pasta `dist/`.

## 🎯 Como Executar

### Execução Completa (Fluxo Completo)

#### 1. Inicie o Serviço de Processamento

```bash
# Inicia o serviço que monitora a fila SQS
npm start
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

## ⚙️ Configuração

### Configurações Principais (`src/infrastructure/config/AppConfig.ts`)

```typescript
export const defaultConfig: AppConfig = {
  aws: {
    region: 'us-east-1',
    endpoint: 'http://localhost:4566', // LocalStack
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  },
  s3: {
    forcePathStyle: true, // Necessário para LocalStack
  },
  queue: {
    name: 'video_processed',
    checkIntervalMs: 20000, // Verifica fila a cada 20 segundos
  },
};
```

### Para Usar AWS Real (Produção)

Altere as configurações em `AppConfig.ts`:

```typescript
export const productionConfig: AppConfig = {
  aws: {
    region: 'us-east-1', // Sua região AWS
    endpoint: undefined, // Remove endpoint para usar AWS real
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  },
  s3: {
    forcePathStyle: false,
  },
  queue: {
    name: 'video_processed',
    checkIntervalMs: 10000,
  },
};
```

## 🐛 Solução de Problemas

### Problema: FFmpeg não encontrado

**Erro**: `FFmpeg spawn error: spawn ffmpeg ENOENT`

**Solução**:
- Instale o FFmpeg e certifique-se de que está no PATH do sistema
- No Windows, reinicie o terminal após instalar

### Problema: LocalStack não conecta

**Erro**: Conexão recusada na porta 4566

**Solução**:
```bash
# Verifique se LocalStack está rodando
docker-compose ps

# Se não estiver, inicie
docker-compose up -d

# Verifique os logs se houver problemas
docker-compose logs localstack
```

### Problema: Arquivo de vídeo não encontrado

**Erro**: `Arquivo não encontrado: video/videoplayback.mp4`

**Solução**:
- Coloque um arquivo de vídeo na pasta `video/` com o nome `videoplayback.mp4`
- Ou altere o caminho no script `src/scripts/testUpload.ts`

### Problema: Permissões no Windows

**Erro**: Problemas de permissão ao criar arquivos

**Solução**:
- Execute o terminal como administrador
- Ou altere as pastas `tmp/` e `outputs/` para um local com permissões adequadas

