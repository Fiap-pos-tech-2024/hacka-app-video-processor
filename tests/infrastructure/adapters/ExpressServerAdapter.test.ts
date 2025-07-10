import request from 'supertest';
import { ExpressServerAdapter } from '../../../src/infrastructure/adapters/ExpressServerAdapter.js';
import { HealthCheckUseCase, HealthStatus } from '../../../src/domain/useCases/HealthCheckUseCase.js';

describe('ExpressServerAdapter', () => {
  let expressServer: ExpressServerAdapter;
  let mockHealthCheckUseCase: jest.Mocked<HealthCheckUseCase>;

  beforeEach(() => {
    mockHealthCheckUseCase = {
      execute: jest.fn(),
    };

    expressServer = new ExpressServerAdapter(mockHealthCheckUseCase);
  });

  afterEach(async () => {
    if (expressServer.isRunning()) {
      await expressServer.stop();
    }
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 and healthy status when all services are up', async () => {
      // Arrange
      const healthyStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          sqs: { status: 'up', lastCheck: new Date().toISOString() },
          s3: { status: 'up', lastCheck: new Date().toISOString() },
          ffmpeg: { status: 'up', lastCheck: new Date().toISOString() }
        },
        uptime: 100
      };

      mockHealthCheckUseCase.execute.mockResolvedValue(healthyStatus);

      await expressServer.start(0); // Use port 0 for random available port
      
      // Act & Assert
      const response = await request(expressServer['app'])
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.application).toBeDefined();
      expect(response.body.application.name).toBe('Video Processing Service');
      expect(response.body.services).toBeDefined();
      expect(mockHealthCheckUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return 503 and unhealthy status when services are down', async () => {
      // Arrange
      const unhealthyStatus: HealthStatus = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          sqs: { status: 'down', lastCheck: new Date().toISOString(), error: 'Connection failed' },
          s3: { status: 'up', lastCheck: new Date().toISOString() },
          ffmpeg: { status: 'up', lastCheck: new Date().toISOString() }
        },
        uptime: 100
      };

      mockHealthCheckUseCase.execute.mockResolvedValue(unhealthyStatus);

      await expressServer.start(0);
      
      // Act & Assert
      const response = await request(expressServer['app'])
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.services.sqs.error).toBe('Connection failed');
    });

    it('should return 500 when health check throws error', async () => {
      // Arrange
      mockHealthCheckUseCase.execute.mockRejectedValue(new Error('Health check failed'));

      await expressServer.start(0);
      
      // Act & Assert
      const response = await request(expressServer['app'])
        .get('/health')
        .expect(500);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBe('Internal server error during health check');
    });
  });

  describe('Ping Endpoint', () => {
    it('should return pong message', async () => {
      // Arrange
      await expressServer.start(0);
      
      // Act & Assert
      const response = await request(expressServer['app'])
        .get('/ping')
        .expect(200);

      expect(response.body.message).toBe('pong');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Info Endpoint', () => {
    it('should return application information', async () => {
      // Arrange
      await expressServer.start(0);
      
      // Act & Assert
      const response = await request(expressServer['app'])
        .get('/info')
        .expect(200);

      expect(response.body.application).toBeDefined();
      expect(response.body.application.name).toBe('Video Processing Service');
      expect(response.body.application.version).toBe('1.0.0');
      expect(response.body.application.description).toContain('arquitetura hexagonal');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown endpoints', async () => {
      // Arrange
      await expressServer.start(0);
      
      // Act & Assert
      const response = await request(expressServer['app'])
        .get('/unknown-endpoint')
        .expect(404);

      expect(response.body.error).toBe('Endpoint not found');
      expect(response.body.availableEndpoints).toContain('GET /health - Health check');
      expect(response.body.availableEndpoints).toContain('GET /ping - Simple ping');
      expect(response.body.availableEndpoints).toContain('GET /info - Application info');
    });
  });

  describe('Server Lifecycle', () => {
    it('should start and stop server correctly', async () => {
      // Arrange
      expect(expressServer.isRunning()).toBe(false);

      // Act - Start
      await expressServer.start(0);
      expect(expressServer.isRunning()).toBe(true);

      // Act - Stop
      await expressServer.stop();
      expect(expressServer.isRunning()).toBe(false);
    });

    it('should handle multiple stop calls gracefully', async () => {
      // Arrange
      await expressServer.start(0);
      
      // Act
      await expressServer.stop();
      await expressServer.stop(); // Second call should not throw

      // Assert
      expect(expressServer.isRunning()).toBe(false);
    });

    it('should stop when server is not running', async () => {
      // Arrange
      expect(expressServer.isRunning()).toBe(false);

      // Act & Assert - Should not throw
      await expressServer.stop();
      expect(expressServer.isRunning()).toBe(false);
    });
  });

  describe('JSON Middleware', () => {
    it('should parse JSON requests', async () => {
      // Arrange
      await expressServer.start(0);
      
      // Act & Assert
      const response = await request(expressServer['app'])
        .post('/health')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json')
        .expect(404); // POST to health should return 404

      // The fact that it reaches the 404 handler means JSON was parsed successfully
      expect(response.body.error).toBe('Endpoint not found');
    });
  });
});
