# Use a imagem oficial do Node.js
FROM node:20-alpine

# Instalar FFmpeg para processamento de vídeo
RUN apk add --no-cache ffmpeg

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json (se existir)
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Compilar TypeScript
RUN npm run build

# Criar diretórios necessários
RUN mkdir -p tmp outputs upload

# Expor porta (se necessário para futuras funcionalidades)
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
