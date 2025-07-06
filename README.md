# 🎬 Video Processing Service

> Serviço de processamento de vídeos com arquitetura hexagonal que monitora fila SQS, processa vídeos do S3 e extrai frames usando FFmpeg.

## � Executando com Docker (Recomendado)

### Pré-requisitos

- **Docker** e **Docker Compose**

### Execução Simples

1. **Windows:**
   ```bash
   start.bat
   ```

2. **Linux/Mac:**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

3. **Manual:**
   ```bash
   docker-compose up --build
   ```

### Como Usar

1. Coloque seu vídeo na pasta `video/`
2. A aplicação irá processar automaticamente e gerar frames na pasta `outputs/`
3. Para parar: `docker-compose down`

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
# Executar em produção
npm start

# Executar em desenvolvimento (com watch)
npm run dev

# Testar upload de vídeo
npm run test-upload
```

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



cd hacka-app-processor
npm run build
docker build -t maickway/video-processor:latest .
docker push maickway/video-processor:latest