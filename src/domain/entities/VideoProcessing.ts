export interface VideoProcessingData {
  registerId: string;
  savedVideoKey: string;
  originalVideoName: string;
  type: string;
  email?: string;
}

export interface ProcessingResult {
  success: boolean;
  registerId: string;
  savedVideoKey: string;
  originalVideoName: string;
  type: string;
  email?: string;
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
    public readonly email?: string
  ) {}

  static fromData(data: VideoProcessingData): VideoProcessing {
    return new VideoProcessing(
      data.registerId,
      data.savedVideoKey,
      data.originalVideoName,
      data.type,
      data.email
    );
  }

  toData(): VideoProcessingData {
    return {
      registerId: this.registerId,
      savedVideoKey: this.savedVideoKey,
      originalVideoName: this.originalVideoName,
      type: this.type,
      email: this.email
    };
  }
}
