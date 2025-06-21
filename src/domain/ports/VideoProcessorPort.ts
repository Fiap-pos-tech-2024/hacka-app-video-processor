export interface VideoProcessorPort {
  extractFrames(inputPath: string, outputDir: string): Promise<string[]>;
  createZipFromFrames(framesDir: string, outputPath: string): Promise<void>;
}
