import { ProcessingResult } from '../entities/VideoProcessing.js';

export interface NotificationPort {
  notifySuccess(result: ProcessingResult): Promise<void>;
  notifyError(context: any, error: any): Promise<void>;
}
