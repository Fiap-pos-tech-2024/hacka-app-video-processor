import { promises as fs } from 'fs';
import fsExtra from 'fs-extra';
import { FileSystemPort } from '../../domain/ports/FileSystemPort.js';

export class NodeFileSystemAdapter implements FileSystemPort {
  async mkdir(path: string): Promise<void> {
    await fs.mkdir(path, { recursive: true });
  }
  async writeFile(path: string, data: Buffer): Promise<void> {
    await fs.writeFile(path, data);
  }

  async readFile(path: string): Promise<Buffer> {
    return await fs.readFile(path);
  }

  async readdir(path: string): Promise<string[]> {
    return await fs.readdir(path);
  }

  async remove(path: string): Promise<void> {
    await fsExtra.remove(path);
  }

  async ensureDir(path: string): Promise<void> {
    await fsExtra.ensureDir(path);
  }

  createWriteStream(path: string): any {
    return fsExtra.createWriteStream(path);
  }
}
