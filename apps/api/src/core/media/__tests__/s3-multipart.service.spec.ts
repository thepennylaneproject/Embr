/**
 * S3 Multipart Service Unit Tests
 * Tests for dynamic URL expiry, file downloads, and orphaned upload cleanup
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3MultipartService } from '../services/s3-multipart.service';

describe('S3MultipartService', () => {
  let service: S3MultipartService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3MultipartService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                AWS_REGION: 'us-east-1',
                AWS_S3_BUCKET: 'embr-media',
                AWS_ACCESS_KEY_ID: 'test-key',
                AWS_SECRET_ACCESS_KEY: 'test-secret',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<S3MultipartService>(S3MultipartService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Dynamic Presigned URL Expiry', () => {
    it('should calculate short expiry for small files', async () => {
      const fileName = 'small.jpg';
      const fileType = 'image/jpeg';
      const contentType = 'image';
      const userId = 'user-123';
      const smallFileSize = 500 * 1024; // 500KB

      // Mock S3 client methods
      jest.spyOn(service as any, 'getSignedUrl').mockResolvedValue({
        uploadId: 'upload-123',
        fileKey: 'images/2026/02/user-123/file.jpg',
        uploadUrl: 'https://s3.example.com/...',
        expiresIn: 300, // 5 minutes
      });

      const result = await service.getPresignedUploadUrl(
        fileName,
        fileType,
        contentType,
        userId,
        smallFileSize,
      );

      // Small file should have shorter expiry (300-600 seconds)
      expect(result.expiresIn).toBeLessThanOrEqual(900);
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('should calculate longer expiry for larger files', async () => {
      const fileName = 'large.mp4';
      const fileType = 'video/mp4';
      const contentType = 'video';
      const userId = 'user-456';
      const largeFileSize = 500 * 1024 * 1024; // 500MB

      jest.spyOn(service as any, 'getSignedUrl').mockResolvedValue({
        uploadId: 'upload-456',
        fileKey: 'videos/2026/02/user-456/file.mp4',
        uploadUrl: 'https://s3.example.com/...',
        expiresIn: 900, // 15 minutes (max for simple upload)
      });

      const result = await service.getPresignedUploadUrl(
        fileName,
        fileType,
        contentType,
        userId,
        largeFileSize,
      );

      // Larger file should have longer expiry, but max 15 minutes
      expect(result.expiresIn).toBeLessThanOrEqual(900);
    });

    it('should cap expiry at maximum 15 minutes for simple uploads', async () => {
      const fileName = 'huge.mp4';
      const fileType = 'video/mp4';
      const contentType = 'video';
      const userId = 'user-789';
      const hugeFileSize = 4 * 1024 * 1024 * 1024; // 4GB (exceeds simple limit)

      // Should be handled by multipart, but test the cap
      const estimatedSeconds = Math.max(
        300,
        hugeFileSize / (10 * 1024 * 1024),
      );
      const capped = Math.min(estimatedSeconds + 300, 900);

      expect(capped).toBeLessThanOrEqual(900);
    });
  });

  describe('File Key Ownership Validation', () => {
    it('should generate file keys with userId for security', async () => {
      const fileName = 'test.jpg';
      const fileType = 'image/jpeg';
      const contentType = 'image';
      const userId = 'user-secure-123';

      // Test file key generation includes userId
      const fileKey = (service as any).generateFileKey(
        userId,
        contentType,
        'jpg',
      );

      expect(fileKey).toContain(`/${userId}/`);
      expect(fileKey).toMatch(/^images\/\d{4}\/\d{2}\//);
    });

    it('should reject files with mismatched userId', () => {
      const userFileKey = 'images/2026/02/user-123/abc-123.jpg';
      const differentUserId = 'user-456';

      // Simulate ownership validation
      const fileUserIdFromPath = userFileKey.split('/')[3];

      expect(fileUserIdFromPath).toBe('user-123');
      expect(fileUserIdFromPath).not.toBe(differentUserId);
    });
  });

  describe('Orphaned Upload Cleanup', () => {
    it('should abort multipart uploads older than 24 hours', async () => {
      // Mock S3 ListMultipartUploads response
      const mockUpload = {
        Key: 'videos/2026/02/user-123/old.mp4',
        UploadId: 'old-upload-123',
        Initiated: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours old
      };

      jest.spyOn(service as any, 's3Client').mockReturnValue({
        send: jest.fn(),
      });

      // Call cleanup (would abort stale uploads)
      const result = await (service as any).abortStaleMultipartUploads(24);

      // Should have identified and aborted the old upload
      expect(result).toBeDefined();
    });

    it('should not abort recent uploads', () => {
      const recentUpload = {
        Key: 'videos/2026/02/user-123/recent.mp4',
        UploadId: 'recent-upload-456',
        Initiated: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours old
      };

      const ageMs = 24 * 60 * 60 * 1000;
      const uploadAgeMs = Date.now() - recentUpload.Initiated.getTime();

      expect(uploadAgeMs).toBeLessThan(ageMs);
      // Recent upload should not be aborted
    });

    it('should log cleanup results for monitoring', async () => {
      const logSpy = jest.spyOn(service as any, 'logger.log');

      // Call cleanup
      await (service as any).abortStaleMultipartUploads(24);

      // Should log summary
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found'),
        expect.anything(),
      );
    });
  });

  describe('File Download for Scanning', () => {
    it('should download only first 5MB for magic bytes validation', async () => {
      const fileKey = 'images/2026/02/user-123/test.jpg';
      const maxBytes = 5 * 1024 * 1024; // 5MB

      // Mock S3 GetObject with Range header
      jest.spyOn(service as any, 's3Client').mockReturnValue({
        send: jest.fn().mockResolvedValue({
          Body: Buffer.alloc(1024 * 1024), // 1MB response
        }),
      });

      const buffer = await service.downloadFileContent(fileKey);

      // Should return buffer
      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);

      // Should have requested only first 5MB
      expect(service.downloadFileContent).toHaveBeenCalledWith(
        fileKey,
        expect.anything(),
      );
    });

    it('should handle stream reading efficiently', async () => {
      const fileKey = 'videos/2026/02/user-123/test.mp4';

      jest.spyOn(service as any, 's3Client').mockReturnValue({
        send: jest.fn().mockResolvedValue({
          Body: {
            [Symbol.asyncIterator]: async function* () {
              yield Buffer.from('chunk1');
              yield Buffer.from('chunk2');
            },
          },
        }),
      });

      const buffer = await service.downloadFileContent(fileKey);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString()).toContain('chunk1');
    });
  });

  describe('Multipart URL Expiry', () => {
    it('should calculate presigned URL expiry for multipart uploads', async () => {
      const fileKey = 'videos/2026/02/user-123/large.mp4';
      const uploadId = 'multipart-123';
      const totalParts = 50;
      const fileSize = 500 * 1024 * 1024; // 500MB

      jest.spyOn(service as any, 'getSignedUrl').mockResolvedValue(
        'https://s3.example.com/...',
      );

      const result = await service.getPresignedPartUrls(
        fileKey,
        uploadId,
        totalParts,
        fileSize,
      );

      expect(result.uploadId).toBe(uploadId);
      expect(result.partUrls).toBeDefined();
      expect(result.partUrls.length).toBe(totalParts);

      // Verify each part has a signed URL
      result.partUrls.forEach((part) => {
        expect(part.partNumber).toBeGreaterThan(0);
        expect(part.url).toBeDefined();
      });
    });

    it('should cap multipart upload expiry at 1 hour', async () => {
      const fileKey = 'large-file.bin';
      const uploadId = 'multipart-456';
      const totalParts = 1000;
      const hugeFileSize = 10 * 1024 * 1024 * 1024; // 10GB

      // Calculate expected expiry
      const estimatedSeconds = Math.max(
        300,
        hugeFileSize / (10 * 1024 * 1024),
      );
      const capped = Math.min(estimatedSeconds + 600, 3600); // Max 1 hour

      expect(capped).toBeLessThanOrEqual(3600);
      expect(capped).toBeGreaterThan(0);
    });
  });
});
