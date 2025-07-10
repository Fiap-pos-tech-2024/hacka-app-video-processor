/**
 * Script para testar a atualização de status na API do microserviço
 * Simula uma execução completa com notificação e atualização de status
 */

import { ConsoleNotificationAdapter } from '../infrastructure/adapters/ConsoleNotificationAdapter.js';
import { ProcessingResult } from '../domain/entities/VideoProcessing.js';
import 'dotenv/config';

async function testStatusUpdate() {
  console.log('🧪 Testando atualização de status na API do microserviço...\n');

  const registerId = '1';
  const savedVideoKey = 'videos/test-video.mp4';
  const savedZipKey = 'outputs/frames_test.zip';
  const originalVideoName = 'test-video.mp4';
  const type = 'mp4';

  const USER_ID = process.env.TEST_USER_ID || 'test-user-id';
  const USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
  const USER_TOKEN = process.env.TEST_USER_TOKEN || 'Bearer <TOKEN>';

  if (USER_TOKEN.includes('<TOKEN>')) {
    console.warn('⚠️ AVISO: Token não foi configurado no .env. Substitua TEST_USER_TOKEN por um valor real para testes.');
  }

  // Adapter
  const adapter = new ConsoleNotificationAdapter('fiap-video-bucket-20250706');

  // Dados de exemplo
  const testResult: ProcessingResult = {
    success: true,
    registerId,
    savedVideoKey,
    savedZipKey,
    originalVideoName,
    type,
    user: {
      id: USER_ID,
      email: USER_EMAIL,
      authorization: USER_TOKEN,
    }
  };

  try {
    console.log('📊 Dados do teste:');
    console.log('- RegisterId:', testResult.registerId);
    console.log('- SavedZipKey:', testResult.savedZipKey);
    console.log('- URL de atualização será:', `http://ms-shared-alb-1798493639.us-east-1.elb.amazonaws.com/video-upload-app/video/${testResult.registerId}`);
    console.log('- Payload:', {
      status: "FINISHED",
      savedZipKey: testResult.savedZipKey
    });
    console.log('\n⚡ Executando notificação de sucesso (que inclui atualização de status)...\n');

    await adapter.notifySuccess(testResult);

    console.log('\n✅ Teste concluído! Verifique os logs acima para ver:');
    console.log('1. 📤 Notificação para API externa de sucesso');
    console.log('2. 📤 Atualização de status na API do microserviço');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

// Executar se for o módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  testStatusUpdate();
}

export { testStatusUpdate };
