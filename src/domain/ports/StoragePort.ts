export interface StoragePort {
  downloadFile(bucket: string, key: string): Promise<Buffer | undefined>;
  uploadFile(bucket: string, key: string, buffer: Buffer): Promise<void>;
}
