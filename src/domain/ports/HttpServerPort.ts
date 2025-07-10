export interface HttpServerPort {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
