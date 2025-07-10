import express, { Application, Request, Response } from 'express';
import { HttpServerPort } from '../../domain/ports/HttpServerPort.js';
import { HealthCheckUseCase } from '../../domain/useCases/HealthCheckUseCase.js';

export class ExpressServerAdapter implements HttpServerPort {
  private app: Application;
  private server: any;
  private running: boolean = false;

  constructor(private healthCheckUseCase: HealthCheckUseCase) {
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Middleware para parsing JSON
    this.app.use(express.json());

    // Rota de health check
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const healthStatus = await this.healthCheckUseCase.execute();
        
        const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
        
        res.status(statusCode).json({
          ...healthStatus,
          application: {
            name: 'Video Processing Service',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
          }
        });
      } catch (error) {
        console.error('[HEALTH] Erro ao verificar saúde do sistema:', error);
        res.status(500).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Internal server error during health check',
          application: {
            name: 'Video Processing Service',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development'
          }
        });
      }
    });

    // Rota básica para verificar se o servidor está respondendo
    this.app.get('/ping', (req: Request, res: Response) => {
      res.json({
        message: 'pong',
        timestamp: new Date().toISOString()
      });
    });

    // Rota para informações básicas da aplicação
    this.app.get('/info', (req: Request, res: Response) => {
      res.json({
        application: {
          name: 'Video Processing Service',
          version: '1.0.0',
          description: 'Serviço de processamento de vídeos com arquitetura hexagonal',
          environment: process.env.NODE_ENV || 'development'
        },
        timestamp: new Date().toISOString()
      });
    });

    // Handler para rotas não encontradas
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: [
          'GET /health - Health check',
          'GET /ping - Simple ping',
          'GET /info - Application info'
        ],
        timestamp: new Date().toISOString()
      });
    });
  }

  async start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          this.running = true;
          console.log(`Servidor HTTP iniciado na porta ${port}`);
          console.log(`Health check disponível em: http://localhost:${port}/health`);
          console.log(`Info da aplicação em: http://localhost:${port}/info`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          this.running = false;
          reject(error);
        });
      } catch (error) {
        this.running = false;
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server && this.running) {
        this.server.close(() => {
          this.running = false;
          console.log('Servidor HTTP encerrado');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  isRunning(): boolean {
    return this.running;
  }
}
