#!/bin/bash

# ====================================================================
# SCRIPT DE DEPLOY E DESTROY DA INFRAESTRUTURA AWS (Linux/MacOS)
# Video Processor - Hackathon Project
# ====================================================================

set -e

ACTION=$1
TERRAFORM_DIR="../terraform-orchestration-video"
DOCKER_IMAGE="maickway/video-processor:v2"
AWS_REGION="us-east-1"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

function log_success() { echo -e "${GREEN}✅ $1${NC}"; }
function log_error() { echo -e "${RED}❌ $1${NC}"; }
function log_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
function log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Verificar se Docker está rodando
function check_docker() {
    if ! docker ps > /dev/null 2>&1; then
        log_error "Docker não está rodando. Inicie o Docker primeiro."
        exit 1
    fi
}

# Verificar se AWS CLI está configurado
function check_aws() {
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        log_error "AWS CLI não está configurado. Execute 'aws configure' primeiro."
        exit 1
    fi
}

# Deploy da infraestrutura
function deploy_infrastructure() {
    log_info "🚀 Iniciando deploy da infraestrutura completa..."
    
    # Verificar pré-requisitos
    check_docker
    check_aws
    
    # Build e push da imagem Docker
    log_info "🐳 Fazendo build e push da imagem Docker..."
    docker build -t $DOCKER_IMAGE .
    docker push $DOCKER_IMAGE
    log_success "Imagem Docker enviada com sucesso!"
    
    # Executar terraform para todos os módulos
    log_info "🏗️  Executando Terraform para todos os módulos..."
    
    cd $TERRAFORM_DIR
    
    # Módulos na ordem correta
    MODULES=(
        "terraform-backend"
        "terraform-network"
        "terraform-cognito"
        "terraform-user-db"
        "terraform-alb"
        "terraform-github-oidc"
        "terraform-video-auth-service"
        "terraform-notification-service"
        "terraform-video-processor"
        "terraform-monitoring-grafana-alloy"
    )
    
    for module in "${MODULES[@]}"; do
        if [ -d "$module" ]; then
            log_info "📦 Aplicando módulo: $module"
            cd "$module"
            
            terraform init -upgrade
            terraform apply -auto-approve
            
            log_success "Módulo $module aplicado com sucesso!"
            cd ..
        fi
    done
    
    log_success "🎉 Infraestrutura implantada com sucesso!"
    show_urls
}

# Destroy da infraestrutura
function destroy_infrastructure() {
    log_warning "🔥 Iniciando destruição da infraestrutura..."
    log_warning "Isso irá destruir TODOS os recursos AWS criados!"
    
    echo "Tem certeza que deseja continuar? (digite 'DESTROY' para confirmar)"
    read -r confirm
    if [ "$confirm" != "DESTROY" ]; then
        log_info "Operação cancelada."
        return
    fi
    
    cd $TERRAFORM_DIR
    
    # Destruir na ordem reversa
    MODULES=(
        "terraform-monitoring-grafana-alloy"
        "terraform-video-processor"
        "terraform-notification-service"
        "terraform-video-auth-service"
        "terraform-github-oidc"
        "terraform-alb"
        "terraform-user-db"
        "terraform-cognito"
        "terraform-network"
        "terraform-backend"
    )
    
    for module in "${MODULES[@]}"; do
        if [ -d "$module" ]; then
            log_info "🗑️  Destruindo módulo: $module"
            cd "$module"
            
            terraform destroy -auto-approve || log_warning "Falha ao destruir $module (pode ser esperado se há dependências)"
            
            cd ..
        fi
    done
    
    log_success "🎉 Infraestrutura destruída com sucesso!"
}

# Mostrar status da infraestrutura
function show_status() {
    log_info "📊 Status da infraestrutura:"
    
    # Verificar serviços ECS
    log_info "🐳 Serviços ECS:"
    services=("video-processor" "video-auth-service")
    
    for service in "${services[@]}"; do
        aws ecs describe-services --cluster microservices-cluster --services $service --query 'services[0].{name:serviceName,status:status,running:runningCount,desired:desiredCount}' --output table 2>/dev/null || log_warning "Serviço $service não encontrado"
    done
    
    # Verificar ALB
    log_info "🔗 Application Load Balancer:"
    ALB_DNS=$(aws elbv2 describe-load-balancers --names ms-shared-alb --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null || echo "não encontrado")
    echo "ALB DNS: http://$ALB_DNS"
    
    show_urls
}

# Mostrar URLs e informações para o time
function show_urls() {
    log_info "📋 INFORMAÇÕES PARA O TIME DE DESENVOLVIMENTO:"
    echo ""
    
    # Obter URLs da infraestrutura
    SQS_URL=$(aws sqs get-queue-url --queue-name video-processing-queue --query 'QueueUrl' --output text 2>/dev/null || echo "não encontrado")
    ALB_DNS=$(aws elbv2 describe-load-balancers --names ms-shared-alb --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null || echo "não encontrado")
    BUCKET=$(aws s3api list-buckets --query 'Buckets[?contains(Name, `video-processor-storage`)].Name' --output text 2>/dev/null || echo "não encontrado")
    
    log_success "🔗 URLs DA INFRAESTRUTURA:"
    echo -e "${YELLOW}  • ALB (Load Balancer): http://$ALB_DNS${NC}"
    echo -e "${YELLOW}  • SQS Queue URL: $SQS_URL${NC}"
    echo -e "${YELLOW}  • S3 Bucket: $BUCKET${NC}"
    echo ""
    
    log_success "📤 COMO ENVIAR VÍDEOS PARA PROCESSAMENTO:"
    echo ""
    echo -e "${CYAN}1. Enviar mensagem para a fila SQS:${NC}"
    echo -e "${NC}   URL: $SQS_URL${NC}"
    echo ""
    echo -e "${CYAN}2. Payload JSON da mensagem:${NC}"
    cat << EOF
{
  "videoKey": "nome-do-video.mp4",
  "bucketName": "$BUCKET",
  "userId": "usuario-123",
  "videoId": "video-456",
  "metadata": {
    "originalName": "video-original.mp4",
    "size": 1024000,
    "duration": 60,
    "format": "mp4"
  }
}
EOF
    
    echo ""
    echo -e "${CYAN}3. Exemplo usando AWS CLI:${NC}"
    cat << EOF
aws sqs send-message \\
  --queue-url '$SQS_URL' \\
  --message-body '{
    "videoKey": "teste-video.mp4",
    "bucketName": "$BUCKET",
    "userId": "user-001",
    "videoId": "vid-001",
    "metadata": {
      "originalName": "meu-video.mp4",
      "size": 2048000,
      "duration": 120,
      "format": "mp4"
    }
  }'
EOF
    
    echo ""
    log_success "📋 INFORMAÇÕES IMPORTANTES:"
    echo -e "${YELLOW}  • O vídeo deve estar no bucket S3 antes de enviar a mensagem${NC}"
    echo -e "${YELLOW}  • O processamento gera frames em formato JPG${NC}"
    echo -e "${YELLOW}  • Os frames são salvos em: frames_<videoId>.zip${NC}"
    echo -e "${YELLOW}  • O processamento é assíncrono - verifique os logs no CloudWatch${NC}"
    echo -e "${YELLOW}  • Região AWS: us-east-1${NC}"
}

# Função principal
function main() {
    echo -e "${MAGENTA}"
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        VIDEO PROCESSOR - DEPLOY SCRIPT                        ║
║                           Hackathon Infrastructure                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    case $ACTION in
        "deploy")
            deploy_infrastructure
            ;;
        "destroy")
            destroy_infrastructure
            ;;
        "status")
            show_status
            ;;
        *)
            log_error "Ação inválida. Use: deploy, destroy, ou status"
            echo "Exemplos:"
            echo "  ./deploy-infrastructure.sh deploy   # Deploy completo"
            echo "  ./deploy-infrastructure.sh destroy  # Destruir tudo"
            echo "  ./deploy-infrastructure.sh status   # Ver status"
            exit 1
            ;;
    esac
}

# Executar
main
