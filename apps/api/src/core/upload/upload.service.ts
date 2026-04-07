import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cdnDomain?: string;

  // Max file sizes (in bytes)
  private readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

  constructor(private configService: ConfigService) {
    this.region = this.configService.get('AWS_REGION', 'us-east-1');
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') ?? '';
    this.cdnDomain = this.configService.get('AWS_CLOUDFRONT_DOMAIN');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    contentType: 'image' | 'video' | 'document',
    userId: string,
  ): Promise<{ url: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    const fileKey = this.generateFileKey(userId, contentType, this.getFileExtension(file.originalname));
    const fileUrl = this.getFileUrl(fileKey);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);
      this.logger.log(`File uploaded successfully: ${fileKey}`);

      return { url: fileUrl };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new BadRequestException('Failed to upload file');
    }
  }

  async uploadImage(file: Express.Multer.File, userId: string): Promise<{ url: string }> {
    // Validate image file
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid image type. Allowed: JPEG, PNG, WebP, GIF');
    }

    if (file.size > this.MAX_IMAGE_SIZE) {
      throw new BadRequestException(`Image size must not exceed ${this.MAX_IMAGE_SIZE / 1024 / 1024}MB`);
    }

    return this.uploadFile(file, 'image', userId);
  }

  async uploadVideo(file: Express.Multer.File, userId: string): Promise<{ url: string }> {
    // Validate video file
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid video type. Allowed: MP4, WebM, MOV');
    }

    if (file.size > this.MAX_VIDEO_SIZE) {
      throw new BadRequestException(`Video size must not exceed ${this.MAX_VIDEO_SIZE / 1024 / 1024 / 1024}GB`);
    }

    return this.uploadFile(file, 'video', userId);
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'bin';
  }

  private generateFileKey(
    userId: string,
    contentType: 'image' | 'video' | 'document',
    extension: string,
  ): string {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    return `${contentType}s/${year}/${month}/${userId}/${uuid}-${timestamp}.${extension}`;
  }

  private getFileUrl(fileKey: string): string {
    if (this.cdnDomain) {
      return `https://${this.cdnDomain}/${fileKey}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileKey}`;
  }
}
