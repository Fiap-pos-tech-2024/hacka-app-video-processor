/**
 * Script para testar a atualização de status na API do microserviço
 * Simula uma execução completa com notificação e atualização de status
 */

import { ConsoleNotificationAdapter } from '../infrastructure/adapters/ConsoleNotificationAdapter.js';
import { ProcessingResult } from '../domain/entities/VideoProcessing.js';

async function testStatusUpdate() {
    console.log('🧪 Testando atualização de status na API do microserviço...\n');

    // Configuração do adapter com dados de teste
    const adapter = new ConsoleNotificationAdapter('fiap-video-bucket-20250706');

    // Dados de exemplo para teste
    const testResult: ProcessingResult = {
        success: true,
        registerId: '1', // ID que será usado na URL da API
        savedVideoKey: 'videos/test-video.mp4',
        savedZipKey: 'outputs/frames_test.zip', // Chave do ZIP gerado
        originalVideoName: 'test-video.mp4',
        type: 'mp4',
        user: {
            id: '54c844b8-d061-70fd-af1a-f30728e48525',
            email: 'erik.fernandes87@gmail.com',
            authorization: 'Bearer eyJraWQiOiJyR05IZWRVS3JCR0NnR1haUTJuY3lNcnJvb3BVaDRDenNUSUVBNEorNnVVPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI1NGM4NDRiOC1kMDYxLTcwZmQtYWYxYS1mMzA3MjhlNDg1MjUiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9nYkJxSWM0VWgiLCJjbGllbnRfaWQiOiI2NzdpczRqMmU5cGd2amJzZDRzZDlya244YyIsIm9yaWdpbl9qdGkiOiIxYTZkMmQ4NS04NmMxLTRiM2EtYWI5Ny1mMjM1NGYzYzQwYzciLCJldmVudF9pZCI6ImYwOGM1ZWQ0LWVkY2YtNDg3MC1hMDdkLTUxNDE4ODY1ODA0YyIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4iLCJhdXRoX3RpbWUiOjE3NTIxMDQxNTgsImV4cCI6MTc1MjEwNzc1OCwiaWF0IjoxNzUyMTA0MTU4LCJqdGkiOiI4ZmZkYzhjYy1iZGJiLTQ3MGUtOGRmZC1iZmFmYmUyZTQzMGMiLCJ1c2VybmFtZSI6IjU0Yzg0NGI4LWQwNjEtNzBmZC1hZjFhLWYzMDcyOGU0ODUyNSJ9.BvKQWxFIxh4IMP9AkAJ1nSJLhxUdwWxRch-Y8Ay2hf8DwJKs_zll16vzXFqtvadSp10eeE7BeEM265N6DqbbW2d8MFqMD-mDSUZwDwc_Cj2W_X4rnoBkaOJHf8_j5q230qytQ8oRKu9DLvmHKk834tF4jdf1-iSaEv2WC12g1po2_YAPQUPoU_kLbZEJERfUzDMIvGbeAdrk6KhQJsexx_wWb7PhFmHmJqprkKdx18oJBc_kUWLTzteYXfTsjILSFD2fzP8Z9BENfMBXVOax-4eFKlJ9sKbui_UW8vrLprd_ul0xGrWN9_z5JazmKSr_8jvjAqM1V6SqMVwq1Y0J_w'
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
        console.log('\nEm caso de erro, ele será capturado e exibido, mas não interromperá o processamento.');

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
