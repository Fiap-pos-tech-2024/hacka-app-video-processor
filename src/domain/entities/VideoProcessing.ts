export interface User {
  id: string;
  email: string;
  authorization: string;
}

export interface VideoProcessingData {
  registerId: string;
  savedVideoKey: string;
  originalVideoName: string;
  type: string;
  user?: User;
}

export interface ProcessingResult {
  success: boolean;
  registerId: string;
  savedVideoKey: string;
  originalVideoName: string;
  type: string;
  user?: User;
  outputPath?: string;
  savedZipKey?: string;
  error?: Error;
}

export class VideoProcessing {
  constructor(
    public readonly registerId: string,
    public readonly savedVideoKey: string,
    public readonly originalVideoName: string,
    public readonly type: string,
    public readonly user?: User
  ) {}

  static fromData(data: VideoProcessingData): VideoProcessing {
    return new VideoProcessing(
      data.registerId,
      data.savedVideoKey,
      data.originalVideoName,
      data.type,
      data.user
    );
  }

  toData(): VideoProcessingData {
    return {
      registerId: this.registerId,
      savedVideoKey: this.savedVideoKey,
      originalVideoName: this.originalVideoName,
      type: this.type,
      user: this.user
    };
  }
}
