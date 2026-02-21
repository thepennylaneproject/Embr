import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadService {
  async uploadFile(_file: Express.Multer.File): Promise<{ url: string }> {
    // Placeholder. Replace with S3 or media pipeline.
    return { url: '' };
  }

  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    return this.uploadFile(file);
  }

  async uploadVideo(file: Express.Multer.File): Promise<{ url: string }> {
    return this.uploadFile(file);
  }
}
