param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("deploy", "destroy", "status")]
    [string]$Action
)

Write-Host "VIDEO PROCESSOR - DEPLOY SCRIPT" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta

function Show-Status {
    Write-Host "Status da infraestrutura:" -ForegroundColor Cyan
    
    # Status do serviço ECS
    try {
        Write-Host "Serviço video-processor:" -ForegroundColor Green
        aws ecs describe-services --cluster microservices-cluster --services video-processor --query 'services[0].{name:serviceName,status:status,running:runningCount,desired:desiredCount}' --output table
    } catch {
        Write-Host "Serviço video-processor não encontrado" -ForegroundColor Red
    }
    
    # URLs da infraestrutura
    Write-Host "`nInformações para o time:" -ForegroundColor Yellow
    
    try {
        $sqsUrl = aws sqs get-queue-url --queue-name video-processing-queue --query 'QueueUrl' --output text 2>$null
        $albDns = aws elbv2 describe-load-balancers --names ms-shared-alb --query 'LoadBalancers[0].DNSName' --output text 2>$null
        $bucket = aws s3api list-buckets --query 'Buckets[?contains(Name,`video-processor-storage`)].Name' --output text 2>$null
        
        Write-Host "URLs da infraestrutura:" -ForegroundColor Green
        Write-Host "• ALB: http://$albDns" -ForegroundColor White
        Write-Host "• SQS Queue: $sqsUrl" -ForegroundColor White  
        Write-Host "• S3 Bucket: $bucket" -ForegroundColor White
        
        Write-Host "`nComo enviar vídeos para processamento:" -ForegroundColor Green
        Write-Host "1. Enviar mensagem para SQS: $sqsUrl" -ForegroundColor White
        Write-Host "2. Payload JSON:" -ForegroundColor White
        
        $jsonPayload = @"
{
  "registerId": "registro-123",
  "savedVideoKey": "nome-do-video.mp4",
  "originalVideoName": "video-original.mp4",
  "type": "frame-extraction",
  "email": "usuario@exemplo.com"
}
"@
        Write-Host $jsonPayload -ForegroundColor Yellow
        
        Write-Host "`n3. Exemplo AWS CLI:" -ForegroundColor White
        Write-Host "aws sqs send-message --queue-url `"$sqsUrl`" --message-body `"SEU_JSON_AQUI`"" -ForegroundColor Yellow
        
    } catch {
        Write-Host "Erro ao obter URLs. Verifique se a infraestrutura está deployada." -ForegroundColor Red
    }
}

function Deploy-Infrastructure {
    Write-Host "Iniciando deploy da infraestrutura..." -ForegroundColor Green
    
    # Build e push Docker
    Write-Host "Build da imagem Docker..." -ForegroundColor Cyan
    docker build -t maickway/video-processor:v2 .
    docker push maickway/video-processor:v2
    
    # Deploy Terraform
    Write-Host "Executando Terraform..." -ForegroundColor Cyan
    $currentDir = Get-Location
    Set-Location "..\terraform-orchestration-video"
    
    # Execute apply-all script
    if (Test-Path "apply-all.sh") {
        bash apply-all.sh
    } else {
        Write-Host "Arquivo apply-all.sh não encontrado" -ForegroundColor Red
    }
    
    Set-Location $currentDir
    Write-Host "Deploy concluído!" -ForegroundColor Green
    Show-Status
}

function Destroy-Infrastructure {
    Write-Host "ATENÇÃO: Isso irá destruir TODA a infraestrutura AWS!" -ForegroundColor Red
    $confirm = Read-Host "Digite 'DESTROY' para confirmar"
    
    if ($confirm -eq "DESTROY") {
        Write-Host "Destruindo infraestrutura..." -ForegroundColor Red
        
        $currentDir = Get-Location
        Set-Location "..\terraform-orchestration-video"
        
        # Execute destroy-all script
        if (Test-Path "destroy-all.sh") {
            bash destroy-all.sh
        } else {
            Write-Host "Arquivo destroy-all.sh não encontrado" -ForegroundColor Red
        }
        
        Set-Location $currentDir
        Write-Host "Infraestrutura destruída!" -ForegroundColor Green
    } else {
        Write-Host "Operação cancelada." -ForegroundColor Yellow
    }
}

# Executar ação
switch ($Action) {
    "deploy" { Deploy-Infrastructure }
    "destroy" { Destroy-Infrastructure }
    "status" { Show-Status }
}
