# Projeto Base TypeScript

Este é um projeto base para aplicações TypeScript.

## Scripts
- `npm run build`: Compila o projeto para a pasta `dist`.
- `npm start`: Executa o arquivo compilado principal.
- `npm run dev`: Executa o projeto em modo desenvolvimento com ts-node.

## Estrutura
- `src/` — Código-fonte TypeScript
- `dist/` — Código compilado JavaScript

## Como usar
1. Escreva seu código em `src/`.
2. Rode `npm run build` para compilar.
3. Rode `npm start` para executar o código compilado.
4. Ou use `npm run dev` para desenvolvimento rápido.


aws --endpoint-url=http://localhost:4566 s3api create-bucket --bucket poc-bucket

node upload\uploadVideo.js "C:\Users\micha\Downloads\videos\sqs\express-sqs-s3-app\base\video\videoplayback.mp4" video 123