import { QueuePort } from '../../src/domain/ports/QueuePort.js';
import { StoragePort } from '../../src/domain/ports/StoragePort.js';
import { FileSystemPort } from '../../src/domain/ports/FileSystemPort.js';
import { VideoProcessorPort } from '../../src/domain/ports/VideoProcessorPort.js';
import { NotificationPort } from '../../src/domain/ports/NotificationPort.js';

// Mocks para os ports
export class MockQueuePort implements QueuePort {
  receiveMessages = jest.fn();
  deleteMessage = jest.fn();
  createQueue = jest.fn();
}

export class MockStoragePort implements StoragePort {
  downloadFile = jest.fn();
  uploadFile = jest.fn();
}

export class MockFileSystemPort implements FileSystemPort {
  mkdir = jest.fn();
  writeFile = jest.fn();
  readdir = jest.fn();
  remove = jest.fn();
  ensureDir = jest.fn();
  createWriteStream = jest.fn();
}

export class MockVideoProcessorPort implements VideoProcessorPort {
  extractFrames = jest.fn();
  createZipFromFrames = jest.fn();
}

export class MockNotificationPort implements NotificationPort {
  notifySuccess = jest.fn();
  notifyError = jest.fn();
}

// Factory function para criar mocks limpos
export const createMockPorts = () => ({
  queuePort: new MockQueuePort(),
  storagePort: new MockStoragePort(),
  fileSystemPort: new MockFileSystemPort(),
  videoProcessorPort: new MockVideoProcessorPort(),
  notificationPort: new MockNotificationPort()
});
