param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("deploy", "destroy", "status")]
    [string]$Action
)

# Configurações
$TERRAFORM_DIR = "..\terraform-orchestration-video"
$DOCKER_IMAGE = "maickway/video-processor:v2"

function Write-Success { param([string]$Text) Write-Host "✅ $Text" -ForegroundColor Green }
function Write-Error { param([string]$Text) Write-Host "❌ $Text" -ForegroundColor Red }
function Write-Info { param([string]$Text) Write-Host "ℹ️  $Text" -ForegroundColor Cyan }
function Write-Warning { param([string]$Text) Write-Host "⚠️  $Text" -ForegroundColor Yellow }

function Deploy-Infrastructure {
    Write-Info "🚀 Iniciando deploy da infraestrutura completa..."
    
    # Build e push da imagem Docker
    Write-Info "🐳 Fazendo build e push da imagem Docker..."
    docker build -t $DOCKER_IMAGE .
    docker push $DOCKER_IMAGE
    Write-Success "Imagem Docker enviada com sucesso!"
    
    # Executar terraform para todos os módulos
    Write-Info "🏗️  Executando Terraform para todos os módulos..."
    
    $originalLocation = Get-Location
    Set-Location $TERRAFORM_DIR
    
    $modules = @(
        "terraform-backend",
        "terraform-network", 
        "terraform-cognito",
        "terraform-user-db",
        "terraform-alb",
        "terraform-github-oidc",
        "terraform-video-auth-service",
        "terraform-notification-service",
        "terraform-video-processor",
        "terraform-monitoring-grafana-alloy"
    )
    
    foreach ($module in $modules) {
        if (Test-Path $module) {
            Write-Info "📦 Aplicando módulo: $module"
            Set-Location $module
            terraform init -upgrade
            terraform apply -auto-approve
            Write-Success "Módulo $module aplicado com sucesso!"
            Set-Location ..
        }
    }
    
    Set-Location $originalLocation
    Write-Success "🎉 Infraestrutura implantada com sucesso!"
    Show-URLs
}

function Destroy-Infrastructure {
    Write-Warning "🔥 Iniciando destruição da infraestrutura..."
    Write-Warning "Isso irá destruir TODOS os recursos AWS criados!"
    
    $confirm = Read-Host "Tem certeza que deseja continuar? (digite 'DESTROY' para confirmar)"
    if ($confirm -ne "DESTROY") {
        Write-Info "Operação cancelada."
        return
    }
    
    $originalLocation = Get-Location
    Set-Location $TERRAFORM_DIR
    
    $modules = @(
        "terraform-monitoring-grafana-alloy",
        "terraform-video-processor",
        "terraform-notification-service", 
        "terraform-video-auth-service",
        "terraform-github-oidc",
        "terraform-alb",
        "terraform-user-db",
        "terraform-cognito",
        "terraform-network",
        "terraform-backend"
    )
    
    foreach ($module in $modules) {
        if (Test-Path $module) {
            Write-Info "🗑️  Destruindo módulo: $module"
            Set-Location $module
            terraform destroy -auto-approve
            Write-Success "Módulo $module destruído com sucesso!"
            Set-Location ..
        }
    }
    
    Set-Location $originalLocation
    Write-Success "🎉 Infraestrutura destruída com sucesso!"
}

function Show-Status {
    Write-Info "📊 Status da infraestrutura:"
    
    Write-Info "🐳 Serviços ECS:"
    try {
        $status = aws ecs describe-services --cluster microservices-cluster --services video-processor --query 'services[0].{name:serviceName,status:status,running:runningCount,desired:desiredCount}' --output table
        Write-Host $status
    } catch {
        Write-Warning "Serviço video-processor não encontrado"
    }
    
    Write-Info "🔗 Application Load Balancer:"
    try {
        $albDns = aws elbv2 describe-load-balancers --names ms-shared-alb --query 'LoadBalancers[0].DNSName' --output text
        Write-Host "ALB DNS: http://$albDns"
    } catch {
        Write-Warning "ALB não encontrado"
    }
    
    Show-URLs
}

function Show-URLs {
    Write-Info "📋 INFORMAÇÕES PARA O TIME DE DESENVOLVIMENTO:"
    Write-Host ""
    
    try {
        $sqsUrl = aws sqs get-queue-url --queue-name video-processing-queue --query 'QueueUrl' --output text
        $albDns = aws elbv2 describe-load-balancers --names ms-shared-alb --query 'LoadBalancers[0].DNSName' --output text
        $bucket = aws s3api list-buckets --query 'Buckets[?contains(Name, ``video-processor-storage``)].Name' --output text
        
        Write-Success "🔗 URLs DA INFRAESTRUTURA:"
        Write-Host "  • ALB (Load Balancer): http://$albDns" -ForegroundColor Yellow
        Write-Host "  • SQS Queue URL: $sqsUrl" -ForegroundColor Yellow  
        Write-Host "  • S3 Bucket: $bucket" -ForegroundColor Yellow
        Write-Host ""
        
        Write-Success "📤 COMO ENVIAR VÍDEOS PARA PROCESSAMENTO:"
        Write-Host ""
        Write-Host "1. Enviar mensagem para a fila SQS:" -ForegroundColor Cyan
        Write-Host "   URL: $sqsUrl" -ForegroundColor White
        Write-Host ""
        Write-Host "2. Payload JSON da mensagem:" -ForegroundColor Cyan
        
        $payload = @'
{
  "videoKey": "nome-do-video.mp4",
  "bucketName": "BUCKET_NAME",
  "userId": "usuario-123",
  "videoId": "video-456",
  "metadata": {
    "originalName": "video-original.mp4",
    "size": 1024000,
    "duration": 60,
    "format": "mp4"
  }
}
'@
        $payload = $payload.Replace("BUCKET_NAME", $bucket)
        Write-Host $payload -ForegroundColor White
        
        Write-Host ""
        Write-Host "3. Exemplo usando AWS CLI:" -ForegroundColor Cyan
        Write-Host "aws sqs send-message --queue-url '$sqsUrl' --message-body 'SEU_JSON_AQUI'" -ForegroundColor White
        
        Write-Host ""
        Write-Success "📋 INFORMAÇÕES IMPORTANTES:"
        Write-Host "  • O vídeo deve estar no bucket S3 antes de enviar a mensagem" -ForegroundColor Yellow
        Write-Host "  • O processamento gera frames em formato JPG" -ForegroundColor Yellow
        Write-Host "  • Os frames são salvos em: frames_<videoId>.zip" -ForegroundColor Yellow
        Write-Host "  • O processamento é assíncrono - verifique os logs no CloudWatch" -ForegroundColor Yellow
        Write-Host "  • Região AWS: us-east-1" -ForegroundColor Yellow
        
    } catch {
        Write-Warning "Não foi possível obter todas as URLs. Verifique se a infraestrutura está deployada."
    }
}

# Função principal
Write-Host "
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        VIDEO PROCESSOR - DEPLOY SCRIPT                        ║
║                           Hackathon Infrastructure                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝
" -ForegroundColor Magenta

switch ($Action) {
    "deploy" { Deploy-Infrastructure }
    "destroy" { Destroy-Infrastructure }
    "status" { Show-Status }
    default { 
        Write-Error "Ação inválida. Use: deploy, destroy, ou status"
        Write-Host "Exemplos:"
        Write-Host "  .\deploy-infrastructure.ps1 deploy   # Deploy completo"
        Write-Host "  .\deploy-infrastructure.ps1 destroy  # Destruir tudo"
        Write-Host "  .\deploy-infrastructure.ps1 status   # Ver status"
    }
}
