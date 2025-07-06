#!/bin/bash

# Script para fazer build e push da imagem Docker para deploy

set -e

# Configurações
IMAGE_NAME="maickway/video-processor"
TAG=${1:-latest}
FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"

echo "🚀 Iniciando processo de deploy..."
echo "📦 Imagem: $FULL_IMAGE_NAME"

# Build da aplicação TypeScript
echo "🔨 Fazendo build da aplicação..."
npm run build

# Build da imagem Docker
echo "🐳 Fazendo build da imagem Docker..."
docker build -t $FULL_IMAGE_NAME .

# Push para Docker Hub (requer login)
echo "📤 Fazendo push para Docker Hub..."
docker push $FULL_IMAGE_NAME

echo "✅ Deploy concluído!"
echo "🏷️  Imagem disponível: $FULL_IMAGE_NAME"
echo ""
echo "Para aplicar no Terraform:"
echo "cd ../terraform-orchestration-video/terraform-video-processor"
echo "terraform apply"
