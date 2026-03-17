/**
 * Media Upload Controller Integration Tests
 * Tests for file size validation, quotas, magic bytes, and error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { MediaUploadController } from '../controllers/media-upload.controller';
import { S3MultipartService } from '../services/s3-multipart.service';
import { MuxVideoService } from '../services/mux-video.service';
import { ThumbnailService } from '../services/thumbnail.service';
import { MediaService } from '../services/media.service';
import { MediaValidatorService } from '../services/media-validator.service';
import { InitiateUploadDto, ContentType } from '../dto/media-upload.dto';

describe('MediaUploadController', () => {
  let controller: MediaUploadController;
  let s3Service: S3MultipartService;
  let mediaService: MediaService;
  let mediaValidator: MediaValidatorService;
  let muxService: MuxVideoService;

  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaUploadController],
      providers: [
        {
          provide: S3MultipartService,
          useValue: {
            shouldUseMultipart: jest.fn(),
            getPresignedUploadUrl: jest.fn(),
            initializeMultipartUpload: jest.fn(),
            getPresignedPartUrls: jest.fn(),
            downloadFileContent: jest.fn(),
            fileExists: jest.fn(),
            getFileMetadata: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: MuxVideoService,
          useValue: {
            createDirectUpload: jest.fn(),
          },
        },
        {
          provide: ThumbnailService,
          useValue: {
            generateVideoThumbnail: jest.fn(),
          },
        },
        {
          provide: MediaService,
          useValue: {
            getMediaStats: jest.fn(),
            createMediaRecord: jest.fn(),
            getMediaById: jest.fn(),
          },
        },
        {
          provide: MediaValidatorService,
          useValue: {
            checkForMalicious: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MediaUploadController>(MediaUploadController);
    s3Service = module.get<S3MultipartService>(S3MultipartService);
    mediaService = module.get<MediaService>(MediaService);
    mediaValidator = module.get<MediaValidatorService>(MediaValidatorService);
    muxService = module.get<MuxVideoService>(MuxVideoService);
  });

  describe('initiateUpload', () => {
    it('should reject file exceeding max size (1GB)', async () => {
      const dto: InitiateUploadDto = {
        fileName: 'huge-file.mp4',
        fileType: 'video/mp4',
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB (exceeds 1GB max)
        contentType: ContentType.VIDEO,
      };

      await expect(async () => {
        await controller.initiateUpload(mockUser, dto);
      }).rejects.toThrow();
    });

    it('should allow file within size limits', async () => {
      // Use DOCUMENT to avoid the Mux path (VIDEO goes through Mux for large files)
      const dto: InitiateUploadDto = {
        fileName: 'report.pdf',
        fileType: 'application/pdf',
        fileSize: 500 * 1024 * 1024, // 500MB (within limit)
        contentType: ContentType.DOCUMENT,
      };

      jest.spyOn(mediaService, 'getMediaStats').mockResolvedValue({
        totalFiles: 5,
        totalSize: 1 * 1024 * 1024 * 1024, // 1GB used
        byType: [],
        byStatus: [],
      });

      jest.spyOn(s3Service, 'shouldUseMultipart').mockReturnValue(true);
      jest.spyOn(s3Service, 'initializeMultipartUpload').mockResolvedValue({
        uploadId: 'upload-123',
        fileKey: 'documents/2026/02/user-123/file.pdf',
        partSize: 10 * 1024 * 1024,
        totalParts: 50,
      });

      jest.spyOn(s3Service, 'getPresignedPartUrls').mockResolvedValue({
        uploadId: 'upload-123',
        partUrls: [{ partNumber: 1, url: 'https://s3.example.com/...' }],
      });

      const result = await controller.initiateUpload(mockUser, dto);
      expect(result).toBeDefined();
      expect(result.uploadType).toBe('multipart');
    });

    it('should reject upload that exceeds user quota', async () => {
      const dto: InitiateUploadDto = {
        fileName: 'video.mp4',
        fileType: 'video/mp4',
        fileSize: 50 * 1024 * 1024 * 1024, // 50GB
        contentType: ContentType.VIDEO,
      };

      jest.spyOn(mediaService, 'getMediaStats').mockResolvedValue({
        totalFiles: 100,
        totalSize: 90 * 1024 * 1024 * 1024, // 90GB used (100GB quota)
        byType: [],
        byStatus: [],
      });

      await expect(async () => {
        await controller.initiateUpload(mockUser, dto);
      }).rejects.toThrow(HttpException);
    });

    it('should calculate dynamic presigned URL expiry based on file size', async () => {
      const dto: InitiateUploadDto = {
        fileName: 'file.jpg',
        fileType: 'image/jpeg',
        fileSize: 2 * 1024 * 1024, // 2MB
        contentType: ContentType.IMAGE,
      };

      jest.spyOn(mediaService, 'getMediaStats').mockResolvedValue({
        totalFiles: 1,
        totalSize: 100 * 1024 * 1024,
        byType: [],
        byStatus: [],
      });

      jest.spyOn(s3Service, 'shouldUseMultipart').mockReturnValue(false);
      jest.spyOn(s3Service, 'getPresignedUploadUrl').mockResolvedValue({
        uploadId: 'upload-456',
        fileKey: 'images/2026/02/user-123/file.jpg',
        uploadUrl: 'https://s3.example.com/...',
        expiresIn: 300, // Should be ~300s for 2MB file
      });

      const result = await controller.initiateUpload(mockUser, dto) as any;
      expect(result.expiresIn).toBeLessThanOrEqual(900); // Max 15 minutes
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('should validate file type and reject disallowed types', async () => {
      const dto: InitiateUploadDto = {
        fileName: 'script.exe',
        fileType: 'application/x-msdownload',
        fileSize: 1 * 1024 * 1024,
        contentType: ContentType.VIDEO, // Mismatch: .exe shouldn't be video
      };

      jest.spyOn(mediaService, 'getMediaStats').mockResolvedValue({
        totalFiles: 0,
        totalSize: 0,
        byType: [],
        byStatus: [],
      });

      await expect(async () => {
        await controller.initiateUpload(mockUser, dto);
      }).rejects.toThrow(HttpException);
    });
  });

  describe('completeUpload', () => {
    it('should enforce magic bytes validation and reject malicious files', async () => {
      const maliciousBuffer = Buffer.from([
        0x4d, 0x5a, // MZ header (Windows PE executable)
        ...Buffer.alloc(100),
      ]);

      jest
        .spyOn(s3Service, 'fileExists')
        .mockResolvedValue(true);

      jest.spyOn(s3Service, 'getFileMetadata').mockResolvedValue({
        size: 1024,
        contentType: 'image/jpeg',
        lastModified: new Date(),
      });

      jest
        .spyOn(s3Service, 'downloadFileContent')
        .mockResolvedValue(maliciousBuffer);

      jest.spyOn(mediaValidator, 'checkForMalicious').mockReturnValue({
        safe: false,
        reason: 'File contains Windows PE/MZ executable code',
      });

      jest.spyOn(s3Service, 'deleteFile').mockResolvedValue(undefined);

      const dto = {
        fileKey: 'images/2026/02/user-123/file.jpg',
        fileName: 'file.jpg',
        contentType: ContentType.IMAGE,
      };

      await expect(async () => {
        await (controller as any).completeUpload(mockUser, dto);
      }).rejects.toThrow(HttpException);

      // Verify malicious file was deleted
      expect(s3Service.deleteFile).toHaveBeenCalledWith(
        'images/2026/02/user-123/file.jpg',
      );
    });

    it('should validate file key ownership (prevent cross-user access)', async () => {
      const dto = {
        fileKey: 'images/2026/02/other-user/file.jpg', // Different userId
        fileName: 'file.jpg',
        contentType: ContentType.IMAGE,
      };

      await expect(async () => {
        await (controller as any).completeUpload(mockUser, dto);
      }).rejects.toThrow(HttpException);
    });

    it('should accept safe files and create media record', async () => {
      const safeBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, // JPEG header
        ...Buffer.alloc(100),
      ]);

      jest
        .spyOn(s3Service, 'fileExists')
        .mockResolvedValue(true);

      jest.spyOn(s3Service, 'getFileMetadata').mockResolvedValue({
        size: 1024 * 1024,
        contentType: 'image/jpeg',
        lastModified: new Date(),
      });

      jest
        .spyOn(s3Service, 'downloadFileContent')
        .mockResolvedValue(safeBuffer);

      jest.spyOn(mediaValidator, 'checkForMalicious').mockReturnValue({
        safe: true,
      });

      jest.spyOn(mediaService, 'createMediaRecord').mockResolvedValue({
        id: 'media-123',
        userId: mockUser.id,
        fileName: 'file.jpg',
        status: 'completed',
      } as any);

      const dto = {
        fileKey: 'images/2026/02/user-123/file.jpg',
        fileName: 'file.jpg',
        contentType: ContentType.IMAGE,
      };

      const result = await (controller as any).completeUpload(mockUser, dto);
      expect(result.success).toBe(true);
      expect(mediaService.createMediaRecord).toHaveBeenCalled();
    });
  });

  describe('Mux integration', () => {
    it('should set playback policy to signed by default (private)', async () => {
      const dto: InitiateUploadDto = {
        fileName: 'video.mp4',
        fileType: 'video/mp4',
        fileSize: 500 * 1024 * 1024,
        contentType: ContentType.VIDEO,
        isPrivate: true, // Default
      };

      jest.spyOn(mediaService, 'getMediaStats').mockResolvedValue({
        totalFiles: 0,
        totalSize: 0,
        byType: [],
        byStatus: [],
      });

      jest.spyOn(s3Service, 'shouldUseMultipart').mockReturnValue(true);
      jest.spyOn(s3Service, 'downloadFileContent').mockResolvedValue(Buffer.alloc(0));

      jest.spyOn(muxService, 'createDirectUpload').mockResolvedValue({
        uploadId: 'mux-upload-123',
        uploadUrl: 'https://uploads.mux.com/...',
        assetId: 'mux-asset-123',
      });

      jest.spyOn(mediaService, 'createMediaRecord').mockResolvedValue({
        id: 'media-123',
        userId: mockUser.id,
        fileName: 'video.mp4',
        status: 'uploading',
      } as any);

      const result = await controller.initiateUpload(mockUser, dto);
      expect(result.uploadType).toBe('mux');

      // Verify signed playback policy was used
      expect(muxService.createDirectUpload).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          playbackPolicy: ['signed'],
        }),
      );
    });

    it('should set playback policy to public when explicitly requested', async () => {
      const dto: InitiateUploadDto = {
        fileName: 'video.mp4',
        fileType: 'video/mp4',
        fileSize: 500 * 1024 * 1024,
        contentType: ContentType.VIDEO,
        isPrivate: false, // Public
      };

      jest.spyOn(mediaService, 'getMediaStats').mockResolvedValue({
        totalFiles: 0,
        totalSize: 0,
        byType: [],
        byStatus: [],
      });

      jest.spyOn(s3Service, 'shouldUseMultipart').mockReturnValue(true);

      jest.spyOn(muxService, 'createDirectUpload').mockResolvedValue({
        uploadId: 'mux-upload-456',
        uploadUrl: 'https://uploads.mux.com/...',
        assetId: 'mux-asset-456',
      });

      jest.spyOn(mediaService, 'createMediaRecord').mockResolvedValue({
        id: 'media-456',
        userId: mockUser.id,
        fileName: 'video.mp4',
        status: 'uploading',
      } as any);

      const result = await controller.initiateUpload(mockUser, dto);

      // Verify public playback policy was used
      expect(muxService.createDirectUpload).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          playbackPolicy: ['public'],
        }),
      );
    });
  });
});
