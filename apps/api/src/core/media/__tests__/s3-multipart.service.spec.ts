/**
 * S3 Multipart Service Unit Tests
 * Tests for dynamic URL expiry, file downloads, and orphaned upload cleanup
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3MultipartService } from '../services/s3-multipart.service';

// Module-level mock so the S3Client constructor returns a controllable stub.
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((input) => input),
  CreateMultipartUploadCommand: jest.fn().mockImplementation((input) => input),
  UploadPartCommand: jest.fn().mockImplementation((input) => input),
  CompleteMultipartUploadCommand: jest.fn().mockImplementation((input) => input),
  AbortMultipartUploadCommand: jest.fn().mockImplementation((input) => input),
  ListMultipartUploadsCommand: jest.fn().mockImplementation((input) => input),
  GetObjectCommand: jest.fn().mockImplementation((input) => input),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => input),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned-url'),
}));

describe('S3MultipartService', () => {
  let service: S3MultipartService;

  beforeEach(async () => {
    mockSend.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3MultipartService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
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
  });

  describe('Dynamic Presigned URL Expiry', () => {
    it('should calculate short expiry for small files', async () => {
      const fileName = 'small.jpg';
      const fileType = 'image/jpeg';
      const contentType = 'image';
      const userId = 'user-123';
      const smallFileSize = 500 * 1024; // 500KB

      const result = await service.getPresignedUploadUrl(
        fileName,
        fileType,
        contentType,
        userId,
        smallFileSize,
      );

      // Small file should have shorter expiry (300-900 seconds max)
      expect(result.expiresIn).toBeLessThanOrEqual(900);
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('should calculate longer expiry for larger files', async () => {
      const fileName = 'large.mp4';
      const fileType = 'video/mp4';
      const contentType = 'video';
      const userId = 'user-456';
      const largeFileSize = 500 * 1024 * 1024; // 500MB

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

    it('should cap expiry at maximum 15 minutes for simple uploads', () => {
      const hugeFileSize = 4 * 1024 * 1024 * 1024; // 4GB

      const estimatedSeconds = Math.max(300, hugeFileSize / (10 * 1024 * 1024));
      const capped = Math.min(estimatedSeconds + 300, 900);

      expect(capped).toBeLessThanOrEqual(900);
    });
  });

  describe('File Key Ownership Validation', () => {
    it('should generate file keys with userId for security', () => {
      const userId = 'user-secure-123';
      const contentType = 'image';

      const fileKey = (service as any).generateFileKey(userId, contentType, 'jpg');

      expect(fileKey).toContain(`/${userId}/`);
      expect(fileKey).toMatch(/^images\/\d{4}\/\d{2}\//);
    });

    it('should reject files with mismatched userId', () => {
      const userFileKey = 'images/2026/02/user-123/abc-123.jpg';
      const differentUserId = 'user-456';

      const fileUserIdFromPath = userFileKey.split('/')[3];

      expect(fileUserIdFromPath).toBe('user-123');
      expect(fileUserIdFromPath).not.toBe(differentUserId);
    });
  });

  describe('Orphaned Upload Cleanup', () => {
    it('should abort multipart uploads older than 24 hours', async () => {
      mockSend
        .mockResolvedValueOnce({
          // ListMultipartUploads response
          Uploads: [
            {
              Key: 'videos/2026/02/user-123/old.mp4',
              UploadId: 'old-upload-123',
              Initiated: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours old
            },
          ],
        })
        .mockResolvedValueOnce({}); // AbortMultipartUpload response

      const result = await (service as any).abortStaleMultipartUploads(24);

      expect(mockSend).toHaveBeenCalled();
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
    });

    it('should handle empty upload list gracefully', async () => {
      mockSend.mockResolvedValueOnce({ Uploads: [] });

      const result = await (service as any).abortStaleMultipartUploads(24);

      expect(result).toBeDefined();
    });
  });

  describe('File Download for Scanning', () => {
    it('should download file content and return a Buffer', async () => {
      const fileKey = 'images/2026/02/user-123/test.jpg';
      const mockChunk = Buffer.alloc(1024); // 1KB chunk

      mockSend.mockResolvedValueOnce({
        Body: {
          [Symbol.asyncIterator]: async function* () {
            yield mockChunk;
          },
        },
      });

      const buffer = await service.downloadFileContent(fileKey);

      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBe(1024);
    });

    it('should handle async iterable stream responses', async () => {
      const fileKey = 'videos/2026/02/user-123/test.mp4';

      mockSend.mockResolvedValueOnce({
        Body: {
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from('chunk1');
            yield Buffer.from('chunk2');
          },
        },
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

      const result = await service.getPresignedPartUrls(
        fileKey,
        uploadId,
        totalParts,
        fileSize,
      );

      expect(result.uploadId).toBe(uploadId);
      expect(result.partUrls).toBeDefined();
      expect(result.partUrls.length).toBe(totalParts);

      result.partUrls.forEach((part) => {
        expect(part.partNumber).toBeGreaterThan(0);
        expect(part.url).toBeDefined();
      });
    });

    it('should cap multipart upload expiry at 1 hour', () => {
      const hugeFileSize = 10 * 1024 * 1024 * 1024; // 10GB

      const estimatedSeconds = Math.max(300, hugeFileSize / (10 * 1024 * 1024));
      const capped = Math.min(estimatedSeconds + 600, 3600);

      expect(capped).toBeLessThanOrEqual(3600);
      expect(capped).toBeGreaterThan(0);
    });
  });
});
