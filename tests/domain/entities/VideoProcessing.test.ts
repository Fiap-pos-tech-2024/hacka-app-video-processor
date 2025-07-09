import { VideoProcessing, VideoProcessingData } from '../../../src/domain/entities/VideoProcessing.js';

describe('VideoProcessing Entity', () => {
  const mockData: VideoProcessingData = {
    registerId: 'test-123',
    savedVideoKey: 'videos/test-video.mp4',
    originalVideoName: 'test-video.mp4',
    type: 'mp4'
  };

  describe('Constructor', () => {
    it('should create a VideoProcessing instance with correct properties', () => {
      const videoProcessing = new VideoProcessing(
        mockData.registerId,
        mockData.savedVideoKey,
        mockData.originalVideoName,
        mockData.type
      );

      expect(videoProcessing.registerId).toBe(mockData.registerId);
      expect(videoProcessing.savedVideoKey).toBe(mockData.savedVideoKey);
      expect(videoProcessing.originalVideoName).toBe(mockData.originalVideoName);
      expect(videoProcessing.type).toBe(mockData.type);
    });
  });

  describe('fromData', () => {
    it('should create VideoProcessing from VideoProcessingData', () => {
      const videoProcessing = VideoProcessing.fromData(mockData);

      expect(videoProcessing).toBeInstanceOf(VideoProcessing);
      expect(videoProcessing.registerId).toBe(mockData.registerId);
      expect(videoProcessing.savedVideoKey).toBe(mockData.savedVideoKey);
      expect(videoProcessing.originalVideoName).toBe(mockData.originalVideoName);
      expect(videoProcessing.type).toBe(mockData.type);
    });

    it('should handle minimal data', () => {
      const minimalData: VideoProcessingData = {
        registerId: 'min-123',
        savedVideoKey: 'min.mp4',
        originalVideoName: 'original.mp4',
        type: 'mp4'
      };

      const videoProcessing = VideoProcessing.fromData(minimalData);

      expect(videoProcessing.registerId).toBe(minimalData.registerId);
      expect(videoProcessing.savedVideoKey).toBe(minimalData.savedVideoKey);
    });
  });

  describe('toData', () => {
    it('should convert VideoProcessing instance to VideoProcessingData', () => {
      const videoProcessing = new VideoProcessing(
        mockData.registerId,
        mockData.savedVideoKey,
        mockData.originalVideoName,
        mockData.type
      );

      const data = videoProcessing.toData();

      expect(data).toEqual(mockData);
    });

    it('should return immutable data', () => {
      const videoProcessing = VideoProcessing.fromData(mockData);
      const data1 = videoProcessing.toData();
      const data2 = videoProcessing.toData();

      expect(data1).toEqual(data2);
      expect(data1).not.toBe(data2); // Different objects
    });
  });

  describe('Data integrity', () => {
    it('should maintain data integrity through fromData/toData cycle', () => {
      const originalData = { ...mockData };
      const videoProcessing = VideoProcessing.fromData(originalData);
      const resultData = videoProcessing.toData();

      expect(resultData).toEqual(originalData);
    });
  });
});
