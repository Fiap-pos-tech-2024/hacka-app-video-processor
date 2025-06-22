@echo off
echo 🐳 Iniciando aplicação containerizada...

REM Parar containers se estiverem rodando
docker-compose down

REM Construir e iniciar os serviços
docker-compose up --build

echo ✅ Aplicação iniciada!
echo 📝 Para parar: docker-compose down
