export interface HealthCheckUseCase {
  execute(): Promise<HealthStatus>;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    sqs: ServiceHealth;
    s3: ServiceHealth;
    ffmpeg: ServiceHealth;
  };
  uptime: number;
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'unknown';
  lastCheck?: string;
  error?: string;
}
