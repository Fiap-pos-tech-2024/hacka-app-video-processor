# Script para fazer build e push da imagem Docker para deploy
param(
    [Parameter(Position=0)]
    [string]$Tag = "latest"
)

# Configurações
$ImageName = "maickway/video-processor"
$FullImageName = "$ImageName:$Tag"

Write-Host "🚀 Iniciando processo de deploy..." -ForegroundColor Green
Write-Host "📦 Imagem: $FullImageName" -ForegroundColor Cyan

try {
    # Build da aplicação TypeScript
    Write-Host "🔨 Fazendo build da aplicação..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Erro no build da aplicação" }

    # Build da imagem Docker
    Write-Host "🐳 Fazendo build da imagem Docker..." -ForegroundColor Yellow
    docker build -t $FullImageName .
    if ($LASTEXITCODE -ne 0) { throw "Erro no build da imagem Docker" }

    # Push para Docker Hub (requer login)
    Write-Host "📤 Fazendo push para Docker Hub..." -ForegroundColor Yellow
    docker push $FullImageName
    if ($LASTEXITCODE -ne 0) { throw "Erro no push da imagem" }

    Write-Host "✅ Deploy concluído!" -ForegroundColor Green
    Write-Host "🏷️  Imagem disponível: $FullImageName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para aplicar no Terraform:" -ForegroundColor White
    Write-Host "cd ../terraform-orchestration-video/terraform-video-processor" -ForegroundColor Gray
    Write-Host "terraform apply" -ForegroundColor Gray
}
catch {
    Write-Host "❌ Erro durante o deploy: $_" -ForegroundColor Red
    exit 1
}
