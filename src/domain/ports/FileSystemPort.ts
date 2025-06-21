export interface FileSystemPort {
  mkdir(path: string): Promise<void>;
  writeFile(path: string, data: Buffer): Promise<void>;
  readdir(path: string): Promise<string[]>;
  remove(path: string): Promise<void>;
  ensureDir(path: string): Promise<void>;
  createWriteStream(path: string): any;
}
