#!/bin/bash

echo "🐳 Iniciando aplicação containerizada..."

# Parar containers se estiverem rodando
docker-compose down

# Construir e iniciar os serviços
docker-compose up --build

echo "✅ Aplicação iniciada!"
echo "📝 Para parar: docker-compose down"
