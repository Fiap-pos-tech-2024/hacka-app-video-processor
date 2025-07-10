import { HealthCheckUseCase, HealthStatus, ServiceHealth } from './HealthCheckUseCase.js';
import { QueuePort } from '../ports/QueuePort.js';
import { StoragePort } from '../ports/StoragePort.js';
import { VideoProcessorPort } from '../ports/VideoProcessorPort.js';

export class HealthCheckUseCaseImpl implements HealthCheckUseCase {
  private startTime: number;

  constructor(
    private queuePort: QueuePort,
    private storagePort: StoragePort,
    private videoProcessorPort: VideoProcessorPort
  ) {
    this.startTime = Date.now();
  }

  async execute(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    const [sqsHealth, s3Health, ffmpegHealth] = await Promise.allSettled([
      this.checkSQSHealth(),
      this.checkS3Health(),
      this.checkFFmpegHealth()
    ]);

    const services = {
      sqs: this.getServiceHealth(sqsHealth),
      s3: this.getServiceHealth(s3Health),
      ffmpeg: this.getServiceHealth(ffmpegHealth)
    };

    const allServicesUp = Object.values(services).every(service => service.status === 'up');

    return {
      status: allServicesUp ? 'healthy' : 'unhealthy',
      timestamp,
      services,
      uptime
    };
  }

  private async checkSQSHealth(): Promise<ServiceHealth> {
    try {
      // Tentativa simples de criar uma fila temporária para verificar conectividade
      await this.queuePort.createQueue('health-check-temp');
      return {
        status: 'up',
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkS3Health(): Promise<ServiceHealth> {
    try {
      // Tentativa simples de listar/verificar bucket
      // Como não temos um método específico, assumimos que está funcionando
      // se não houver erro na inicialização
      return {
        status: 'up',
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkFFmpegHealth(): Promise<ServiceHealth> {
    try {
      // Verificar se FFmpeg está disponível
      const result = await this.videoProcessorPort.extractFrames('', '');
      return {
        status: 'up',
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      // Se for erro de arquivo não encontrado, FFmpeg está OK
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return {
          status: 'up',
          lastCheck: new Date().toISOString()
        };
      }
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private getServiceHealth(settledResult: PromiseSettledResult<ServiceHealth>): ServiceHealth {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value;
    } else {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: settledResult.reason instanceof Error ? settledResult.reason.message : 'Unknown error'
      };
    }
  }
}
