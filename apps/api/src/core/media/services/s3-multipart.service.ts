/**
 * S3 Multipart Upload Service
 * Handles large file uploads with multipart functionality and presigned URLs
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListMultipartUploadsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface PresignedUploadResult {
  uploadId: string;
  fileKey: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface MultipartUploadInitResult {
  uploadId: string;
  fileKey: string;
  partSize: number;
  totalParts: number;
}

export interface PresignedPartUrls {
  uploadId: string;
  partUrls: { partNumber: number; url: string }[];
}

export interface CompleteMultipartResult {
  fileUrl: string;
  fileKey: string;
  bucket: string;
}

@Injectable()
export class S3MultipartService {
  private readonly logger = new Logger(S3MultipartService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cdnDomain?: string;

  // 10MB part size for multipart uploads
  private readonly PART_SIZE = 10 * 1024 * 1024;
  // Minimum size for multipart upload (5MB)
  private readonly MULTIPART_THRESHOLD = 5 * 1024 * 1024;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get('AWS_REGION', 'us-east-1');
    this.bucket = this.configService.get('AWS_S3_BUCKET');
    this.cdnDomain = this.configService.get('AWS_CLOUDFRONT_DOMAIN');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  /**
   * Generate presigned URL for simple uploads (< 5MB)
   */
  async getPresignedUploadUrl(
    fileName: string,
    fileType: string,
    contentType: 'image' | 'video' | 'document',
    userId: string,
    fileSize: number,
  ): Promise<PresignedUploadResult> {
    const fileExtension = fileName.split('.').pop();
    const fileKey = this.generateFileKey(userId, contentType, fileExtension);

    // Calculate dynamic expiry based on file size
    // Assume ~10 Mbps upload speed, add 5 min buffer for retries
    const estimatedUploadSeconds = Math.max(300, fileSize / (10 * 1024 * 1024));
    const expiresIn = Math.min(estimatedUploadSeconds + 300, 900); // Max 15 minutes

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    this.logger.log(`Generated presigned URL for ${fileKey} (expires in ${expiresIn}s)`);

    return {
      uploadId: uuidv4(),
      fileKey,
      uploadUrl,
      expiresIn,
    };
  }

  /**
   * Initialize multipart upload for large files
   */
  async initializeMultipartUpload(
    fileName: string,
    fileType: string,
    fileSize: number,
    contentType: 'image' | 'video' | 'document',
    userId: string,
  ): Promise<MultipartUploadInitResult> {
    const fileExtension = fileName.split('.').pop();
    const fileKey = this.generateFileKey(userId, contentType, fileExtension);

    const command = new CreateMultipartUploadCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: fileType,
      Metadata: {
        originalName: fileName,
        userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const result = await this.s3Client.send(command);

    const totalParts = Math.ceil(fileSize / this.PART_SIZE);

    this.logger.log(
      `Initialized multipart upload for ${fileKey} with ${totalParts} parts`,
    );

    return {
      uploadId: result.UploadId,
      fileKey,
      partSize: this.PART_SIZE,
      totalParts,
    };
  }

  /**
   * Generate presigned URLs for each part of multipart upload
   */
  async getPresignedPartUrls(
    fileKey: string,
    uploadId: string,
    totalParts: number,
    fileSize: number,
  ): Promise<PresignedPartUrls> {
    // Calculate dynamic expiry based on total file size
    // Assume ~10 Mbps upload speed for each part (serial)
    // Add 5 min buffer per part (network delays, retries)
    const estimatedUploadSeconds = Math.max(300, fileSize / (10 * 1024 * 1024));
    const expiresIn = Math.min(estimatedUploadSeconds + 600, 3600); // Max 1 hour for multipart

    const partUrls: { partNumber: number; url: string }[] = [];

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const command = new UploadPartCommand({
        Bucket: this.bucket,
        Key: fileKey,
        UploadId: uploadId,
        PartNumber: partNumber,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      partUrls.push({ partNumber, url });
    }

    this.logger.log(
      `Generated ${totalParts} presigned part URLs for ${fileKey} (expires in ${expiresIn}s)`,
    );

    return {
      uploadId,
      partUrls,
    };
  }

  /**
   * Complete multipart upload
   */
  async completeMultipartUpload(
    fileKey: string,
    uploadId: string,
    parts: { PartNumber: number; ETag: string }[],
  ): Promise<CompleteMultipartResult> {
    // Sort parts by part number
    const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber);

    const command = new CompleteMultipartUploadCommand({
      Bucket: this.bucket,
      Key: fileKey,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sortedParts,
      },
    });

    await this.s3Client.send(command);

    const fileUrl = this.getFileUrl(fileKey);

    this.logger.log(`Completed multipart upload for ${fileKey}`);

    return {
      fileUrl,
      fileKey,
      bucket: this.bucket,
    };
  }

  /**
   * Abort multipart upload
   */
  async abortMultipartUpload(fileKey: string, uploadId: string): Promise<void> {
    const command = new AbortMultipartUploadCommand({
      Bucket: this.bucket,
      Key: fileKey,
      UploadId: uploadId,
    });

    await this.s3Client.send(command);

    this.logger.log(`Aborted multipart upload for ${fileKey}`);
  }

  /**
   * Generate signed URL for private content access
   */
  async getSignedUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    this.logger.log(`Generated signed URL for ${fileKey}`);

    return signedUrl;
  }

  /**
   * Delete file from S3
   */
  async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    await this.s3Client.send(command);

    this.logger.log(`Deleted file ${fileKey}`);
  }

  /**
   * Check if file exists
   */
  async fileExists(fileKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileKey: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
  }> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    const response = await this.s3Client.send(command);

    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
    };
  }

  /**
   * Generate CDN or S3 URL for file
   */
  private getFileUrl(fileKey: string): string {
    if (this.cdnDomain) {
      return `https://${this.cdnDomain}/${fileKey}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileKey}`;
  }

  /**
   * Generate unique file key with proper structure
   */
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

  /**
   * Determine if file should use multipart upload
   */
  shouldUseMultipart(fileSize: number): boolean {
    return fileSize >= this.MULTIPART_THRESHOLD;
  }

  /**
   * Abort stale multipart uploads older than specified age
   * Called by scheduled job to clean up abandoned uploads and reduce costs
   * AWS charges for incomplete parts (~$0.05 per GB per month)
   */
  async abortStaleMultipartUploads(ageHours: number = 24): Promise<{
    abortedCount: number;
    releasedBytes: number;
  }> {
    try {
      const command = new ListMultipartUploadsCommand({
        Bucket: this.bucket,
      });

      const result = await this.s3Client.send(command);
      let abortedCount = 0;
      let releasedBytes = 0;
      const ageMs = ageHours * 60 * 60 * 1000;
      const now = Date.now();

      const staleUploads = (result.Uploads || []).filter((upload) => {
        if (!upload.Initiated) return false;
        const uploadAge = now - upload.Initiated.getTime();
        return uploadAge > ageMs;
      });

      this.logger.log(
        `Found ${staleUploads.length} stale multipart uploads older than ${ageHours}h`,
      );

      for (const upload of staleUploads) {
        try {
          const abortCommand = new AbortMultipartUploadCommand({
            Bucket: this.bucket,
            Key: upload.Key,
            UploadId: upload.UploadId,
          });

          await this.s3Client.send(abortCommand);
          abortedCount++;

          // Estimate size based on upload initiation (not 100% accurate but useful for monitoring)
          const estimatedAge = now - (upload.Initiated?.getTime() || now);
          const estimatedSizePerHour = 1024 * 1024; // Assume ~1MB per hour as conservative estimate
          const estimatedSize = Math.ceil(estimatedAge / (60 * 60 * 1000)) * estimatedSizePerHour;
          releasedBytes += estimatedSize;

          this.logger.log(
            `Aborted stale multipart upload: ${upload.Key}/${upload.UploadId} (initiated ${new Date(upload.Initiated || new Date()).toISOString()})`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to abort multipart upload ${upload.Key}/${upload.UploadId}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `Cleanup complete: aborted ${abortedCount} uploads, released ~${(releasedBytes / 1024 / 1024).toFixed(2)}MB`,
      );

      return { abortedCount, releasedBytes };
    } catch (error) {
      this.logger.error('Failed to list multipart uploads for cleanup', error.stack);
      throw error;
    }
  }
}
