# Makefile para Video Processor - LocalStack e desenvolvimento local

LOCALSTACK_CONTAINER_NAME=video-processor-localstack
BUCKET_NAME=video-processor-bucket
QUEUE_NAME=video-processing-queue
AWS_REGION=us-east-1

# Cores para output no terminal
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
CYAN=\033[0;36m
NC=\033[0m # No Color

.PHONY: help up down clean logs status create-aws-resources create-env-file build dev test start

help: ## Mostra este menu de ajuda
	@echo "$(CYAN)🎬 Video Processor - Sistema de Deploy$(NC)"
	@echo "$(YELLOW)Comandos disponíveis:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Inicia LocalStack e infraestrutura local
	@echo "$(CYAN)🚀 Iniciando infraestrutura local...$(NC)"
	docker run --rm -d \
		-p 127.0.0.1:4566:4566 -p 127.0.0.1:4510-4559:4510-4559 \
		--name $(LOCALSTACK_CONTAINER_NAME) \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-e DEBUG=1 \
		-e PERSISTENCE=0 \
		-e SERVICES=s3,sqs \
		localstack/localstack:latest
	@echo "$(GREEN)✅ LocalStack iniciado!$(NC)"
	@sleep 5
	@$(MAKE) create-aws-resources

down: ## Para e remove containers
	@echo "$(YELLOW)🛑 Parando infraestrutura...$(NC)"
	-docker stop $(LOCALSTACK_CONTAINER_NAME)
	-docker rm $(LOCALSTACK_CONTAINER_NAME)
	@echo "$(GREEN)✅ Infraestrutura parada!$(NC)"

clean: down ## Remove containers e limpa volumes
	@echo "$(YELLOW)🧹 Limpando recursos...$(NC)"
	-docker volume prune -f
	-rm -f .env
	@echo "$(GREEN)✅ Limpeza concluída!$(NC)"

create-aws-resources: create-s3 create-queue ## Cria recursos AWS no LocalStack
	@echo "$(GREEN)✅ Recursos AWS criados com sucesso!$(NC)"

create-s3: ## Cria bucket S3 no LocalStack
	@echo "$(CYAN)📦 Criando bucket S3...$(NC)"
	aws --endpoint-url=http://localhost:4566 s3api create-bucket --bucket $(BUCKET_NAME) || true
	@echo "$(GREEN)✅ Bucket S3 criado: $(BUCKET_NAME)$(NC)"

create-queue: ## Cria fila SQS no LocalStack
	@echo "$(CYAN)📬 Criando fila SQS...$(NC)"
	aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name $(QUEUE_NAME) || true
	@echo "$(GREEN)✅ Fila SQS criada: $(QUEUE_NAME)$(NC)"

create-env-file: ## Cria arquivo .env para desenvolvimento local
	@echo "$(CYAN)📝 Criando arquivo .env...$(NC)"
	echo "# Video Processor - Configurações Locais" > .env
	echo "NODE_ENV=development" >> .env
	echo "PORT=3000" >> .env
	echo "AWS_ACCESS_KEY_ID=test" >> .env
	echo "AWS_SECRET_ACCESS_KEY=test" >> .env
	echo "AWS_REGION=$(AWS_REGION)" >> .env
	echo "AWS_ENDPOINT=http://localhost:4566" >> .env
	echo "S3_BUCKET=$(BUCKET_NAME)" >> .env
	QUEUE_URL=$$(aws --endpoint-url=http://localhost:4566 sqs get-queue-url --queue-name $(QUEUE_NAME) --output text --query 'QueueUrl' 2>/dev/null || echo "http://localhost:4566/000000000000/$(QUEUE_NAME)"); \
	echo "SQS_QUEUE_URL=$$QUEUE_URL" >> .env
	@echo "$(GREEN)✅ Arquivo .env criado!$(NC)"

create-env-docker: ## Cria arquivo .env para Docker Compose
	@echo "$(CYAN)📝 Criando arquivo .env para Docker...$(NC)"
	echo "# Video Processor - Configurações Docker" > .env
	echo "NODE_ENV=development" >> .env
	echo "PORT=3000" >> .env
	echo "AWS_ACCESS_KEY_ID=test" >> .env
	echo "AWS_SECRET_ACCESS_KEY=test" >> .env
	echo "AWS_REGION=$(AWS_REGION)" >> .env
	echo "AWS_ENDPOINT=http://localstack:4566" >> .env
	echo "S3_BUCKET=$(BUCKET_NAME)" >> .env
	echo "SQS_QUEUE_URL=http://localstack:4566/000000000000/$(QUEUE_NAME)" >> .env
	@echo "$(GREEN)✅ Arquivo .env para Docker criado!$(NC)"

build: ## Constrói a imagem Docker
	@echo "$(CYAN)🔨 Construindo imagem Docker...$(NC)"
	docker build -t video-processor:latest .
	@echo "$(GREEN)✅ Imagem construída com sucesso!$(NC)"

dev: up create-env-file ## Inicia ambiente de desenvolvimento completo
	@echo "$(GREEN)🎯 Ambiente de desenvolvimento pronto!$(NC)"
	@echo "$(YELLOW)Para testar a aplicação:$(NC)"
	@echo "  1. Execute: npm run dev"
	@echo "  2. Ou use: make start"

start: ## Inicia a aplicação em modo desenvolvimento
	@echo "$(CYAN)▶️  Iniciando aplicação...$(NC)"
	npm run dev

test: ## Executa os testes
	@echo "$(CYAN)🧪 Executando testes...$(NC)"
	npm test

test-upload: build ## Testa upload de vídeo (requer vídeo na pasta ./video/)
	@echo "$(CYAN)📤 Testando processamento de vídeo...$(NC)"
	npm run test-upload

logs: ## Mostra logs do LocalStack
	docker logs -f $(LOCALSTACK_CONTAINER_NAME)

status: ## Mostra status dos serviços
	@echo "$(CYAN)📊 Status dos serviços:$(NC)"
	@echo "$(YELLOW)LocalStack:$(NC)"
	@docker ps --filter name=$(LOCALSTACK_CONTAINER_NAME) --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "$(RED)❌ LocalStack não está rodando$(NC)"
	@echo ""
	@echo "$(YELLOW)Recursos AWS:$(NC)"
	@aws --endpoint-url=http://localhost:4566 s3 ls s3://$(BUCKET_NAME) 2>/dev/null && echo "$(GREEN)✅ Bucket S3: $(BUCKET_NAME)$(NC)" || echo "$(RED)❌ Bucket S3 não encontrado$(NC)"
	@aws --endpoint-url=http://localhost:4566 sqs get-queue-url --queue-name $(QUEUE_NAME) >/dev/null 2>&1 && echo "$(GREEN)✅ SQS Queue: $(QUEUE_NAME)$(NC)" || echo "$(RED)❌ SQS Queue não encontrada$(NC)"

# Comandos Docker Compose
docker-up: create-env-docker ## Inicia todo o ambiente com Docker Compose
	@echo "$(CYAN)🐳 Iniciando ambiente Docker Compose...$(NC)"
	docker-compose up -d
	@sleep 10
	@$(MAKE) create-aws-resources
	@echo "$(GREEN)✅ Ambiente Docker pronto!$(NC)"

docker-down: ## Para ambiente Docker Compose
	@echo "$(YELLOW)🛑 Parando Docker Compose...$(NC)"
	docker-compose down
	@echo "$(GREEN)✅ Docker Compose parado!$(NC)"

docker-logs: ## Mostra logs do Docker Compose
	docker-compose logs -f

# Comandos de integração
send-test-message: ## Envia mensagem de teste para a fila
	@echo "$(CYAN)📤 Enviando mensagem de teste...$(NC)"
	aws --endpoint-url=http://localhost:4566 sqs send-message \
		--queue-url "http://localhost:4566/000000000000/$(QUEUE_NAME)" \
		--message-body '{"registerId":"test-123","savedVideoKey":"videoplayback.mp4","originalVideoName":"test-video.mp4","type":"frame-extraction","email":"test@example.com"}'
	@echo "$(GREEN)✅ Mensagem enviada!$(NC)"

# Comandos utilitários
install: ## Instala dependências
	@echo "$(CYAN)📦 Instalando dependências...$(NC)"
	npm install
	@echo "$(GREEN)✅ Dependências instaladas!$(NC)"

lint: ## Executa linter
	@echo "$(CYAN)🔍 Executando linter...$(NC)"
	npm run lint || echo "$(YELLOW)⚠️  Linter não configurado$(NC)"

# Alvo padrão
all: install up create-env-file build ## Configura ambiente completo
	@echo "$(GREEN)🎉 Ambiente completo configurado!$(NC)"
