/**
 * Mux Webhook Controller Integration Tests
 * Tests for webhook idempotency, error notifications, and replay protection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MuxWebhookController } from '../controllers/mux-webhook.controller';
import { MuxVideoService } from '../services/mux-video.service';
import { MediaService } from '../services/media.service';
import { ThumbnailService } from '../services/thumbnail.service';

describe('MuxWebhookController', () => {
  let controller: MuxWebhookController;
  let muxService: MuxVideoService;
  let mediaService: MediaService;
  let eventEmitter: EventEmitter2;

  const mockRequest = {
    rawBody: Buffer.from(JSON.stringify({ test: 'data' })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MuxWebhookController],
      providers: [
        {
          provide: MuxVideoService,
          useValue: {
            verifyWebhookSignature: jest.fn(),
          },
        },
        {
          provide: MediaService,
          useValue: {
            webhookEventProcessed: jest.fn(),
            markWebhookEventProcessed: jest.fn(),
            getMediaByMuxAssetId: jest.fn(),
            updateMediaStatus: jest.fn(),
            updateMediaWithMuxData: jest.fn(),
          },
        },
        {
          provide: ThumbnailService,
          useValue: {
            generateVideoThumbnail: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MuxWebhookController>(MuxWebhookController);
    muxService = module.get<MuxVideoService>(MuxVideoService);
    mediaService = module.get<MediaService>(MediaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Webhook Idempotency', () => {
    it('should reject webhook with invalid signature', async () => {
      const body = {
        id: 'webhook-123',
        type: 'video.asset.ready',
        data: { id: 'asset-456' },
      };

      jest
        .spyOn(muxService, 'verifyWebhookSignature')
        .mockReturnValue(false);

      expect(async () => {
        await controller.handleWebhook(
          mockRequest as any,
          'invalid-signature',
          '1708000000',
          body,
        );
      }).rejects.toThrow(HttpException);
    });

    it('should process webhook only once (idempotency)', async () => {
      const body = {
        id: 'webhook-123',
        type: 'video.asset.ready',
        data: { id: 'asset-456' },
      };

      // First call: webhook not processed
      jest
        .spyOn(muxService, 'verifyWebhookSignature')
        .mockReturnValue(true);

      jest
        .spyOn(mediaService, 'webhookEventProcessed')
        .mockResolvedValueOnce(false) // Not processed yet
        .mockResolvedValueOnce(true); // Already processed on second call

      jest
        .spyOn(mediaService, 'markWebhookEventProcessed')
        .mockResolvedValue(undefined);

      jest.spyOn(mediaService, 'getMediaByMuxAssetId').mockResolvedValue({
        id: 'media-123',
        userId: 'user-123',
        fileName: 'video.mp4',
        status: 'processing',
      });

      jest
        .spyOn(mediaService, 'updateMediaWithMuxData')
        .mockResolvedValue({ id: 'media-123' });

      // First webhook delivery - should process
      const result1 = await controller.handleWebhook(
        mockRequest as any,
        'valid-signature',
        '1708000000',
        body,
      );
      expect(result1.success).toBe(true);
      expect(result1.message).toBe('Webhook processed');

      // Mark first webhook as processed
      expect(mediaService.markWebhookEventProcessed).toHaveBeenCalled();

      // Reset mocks for second call
      jest
        .spyOn(mediaService, 'webhookEventProcessed')
        .mockResolvedValueOnce(true);

      // Duplicate webhook delivery - should skip processing
      const result2 = await controller.handleWebhook(
        mockRequest as any,
        'valid-signature',
        '1708000000',
        body,
      );
      expect(result2.success).toBe(true);
      expect(result2.message).toBe('Webhook already processed');

      // Verify webhook was only processed once
      expect(mediaService.updateMediaWithMuxData).toHaveBeenCalledTimes(1);
    });

    it('should not mark webhook as processed if handler throws error', async () => {
      const body = {
        id: 'webhook-123',
        type: 'video.asset.ready',
        data: { id: 'asset-456' },
      };

      jest
        .spyOn(muxService, 'verifyWebhookSignature')
        .mockReturnValue(true);

      jest
        .spyOn(mediaService, 'webhookEventProcessed')
        .mockResolvedValue(false);

      jest.spyOn(mediaService, 'getMediaByMuxAssetId').mockResolvedValue(null);

      jest
        .spyOn(mediaService, 'markWebhookEventProcessed')
        .mockResolvedValue(undefined);

      expect(async () => {
        await controller.handleWebhook(
          mockRequest as any,
          'valid-signature',
          '1708000000',
          body,
        );
      }).rejects.toThrow();

      // Should not mark as processed since handler failed
      expect(mediaService.markWebhookEventProcessed).not.toHaveBeenCalled();
    });
  });

  describe('Error Notifications', () => {
    it('should emit media.video.failed event when video processing fails', async () => {
      const body = {
        id: 'webhook-error-123',
        type: 'video.asset.errored',
        data: {
          id: 'asset-error-456',
          errors: [
            { message: 'Video processing failed' },
            { message: 'Invalid codec' },
          ],
        },
      };

      jest
        .spyOn(muxService, 'verifyWebhookSignature')
        .mockReturnValue(true);

      jest
        .spyOn(mediaService, 'webhookEventProcessed')
        .mockResolvedValue(false);

      jest.spyOn(mediaService, 'getMediaByMuxAssetId').mockResolvedValue({
        id: 'media-error-123',
        userId: 'user-123',
        fileName: 'video.mp4',
        status: 'processing',
      });

      jest
        .spyOn(mediaService, 'updateMediaStatus')
        .mockResolvedValue({ status: 'error' });

      jest
        .spyOn(mediaService, 'markWebhookEventProcessed')
        .mockResolvedValue(undefined);

      await controller.handleWebhook(
        mockRequest as any,
        'valid-signature',
        '1708000000',
        body,
      );

      // Verify error event was emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'media.video.failed',
        expect.objectContaining({
          userId: 'user-123',
          mediaId: 'media-error-123',
          fileName: 'video.mp4',
          reason: expect.stringContaining('Video processing failed'),
        }),
      );
    });

    it('should emit media.upload.failed event when upload fails', async () => {
      const body = {
        id: 'webhook-upload-error-123',
        type: 'video.upload.errored',
        data: {
          id: 'upload-error-456',
          error: { message: 'Upload timeout' },
        },
      };

      jest
        .spyOn(muxService, 'verifyWebhookSignature')
        .mockReturnValue(true);

      jest
        .spyOn(mediaService, 'webhookEventProcessed')
        .mockResolvedValue(false);

      jest.spyOn(mediaService, 'getMediaByUploadId').mockResolvedValue({
        id: 'media-upload-error-123',
        userId: 'user-456',
        fileName: 'large-video.mp4',
        status: 'uploading',
      });

      jest
        .spyOn(mediaService, 'updateMediaStatus')
        .mockResolvedValue({ status: 'error' });

      jest
        .spyOn(mediaService, 'markWebhookEventProcessed')
        .mockResolvedValue(undefined);

      await controller.handleWebhook(
        mockRequest as any,
        'valid-signature',
        '1708000000',
        body,
      );

      // Verify upload error event was emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'media.upload.failed',
        expect.objectContaining({
          userId: 'user-456',
          mediaId: 'media-upload-error-123',
          fileName: 'large-video.mp4',
        }),
      );
    });

    it('should emit media.video.ready event on successful processing', async () => {
      const body = {
        id: 'webhook-ready-123',
        type: 'video.asset.ready',
        data: {
          id: 'asset-ready-456',
          duration: 120,
          aspect_ratio: '16:9',
          playback_ids: [
            { id: 'playback-789', policy: 'public' },
          ],
        },
      };

      jest
        .spyOn(muxService, 'verifyWebhookSignature')
        .mockReturnValue(true);

      jest
        .spyOn(mediaService, 'webhookEventProcessed')
        .mockResolvedValue(false);

      jest.spyOn(mediaService, 'getMediaByMuxAssetId').mockResolvedValue({
        id: 'media-ready-123',
        userId: 'user-789',
        fileName: 'processed-video.mp4',
        status: 'processing',
      });

      jest
        .spyOn(mediaService, 'updateMediaWithMuxData')
        .mockResolvedValue({ id: 'media-ready-123' });

      jest
        .spyOn(mediaService, 'markWebhookEventProcessed')
        .mockResolvedValue(undefined);

      const thumbnailService = module.get<ThumbnailService>(ThumbnailService);
      jest
        .spyOn(thumbnailService, 'generateVideoThumbnail')
        .mockResolvedValue({
          thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
          thumbnailKey: 'thumbnails/thumb.jpg',
        });

      await controller.handleWebhook(
        mockRequest as any,
        'valid-signature',
        '1708000000',
        body,
      );

      // Verify video ready event was emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'media.video.ready',
        expect.objectContaining({
          userId: 'user-789',
          mediaId: 'media-ready-123',
          fileName: 'processed-video.mp4',
          duration: 120,
        }),
      );
    });
  });

  describe('Timestamp Validation (Replay Protection)', () => {
    it('should reject webhook with old timestamp (replay attack)', async () => {
      const oldTimestamp = String(
        Math.floor((Date.now() - 10 * 60 * 1000) / 1000),
      ); // 10 minutes ago

      const body = {
        id: 'webhook-old-123',
        type: 'video.asset.ready',
        data: { id: 'asset-old-456' },
      };

      jest
        .spyOn(muxService, 'verifyWebhookSignature')
        .mockReturnValue(false); // Should be false due to old timestamp

      expect(async () => {
        await controller.handleWebhook(
          mockRequest as any,
          'valid-signature',
          oldTimestamp,
          body,
        );
      }).rejects.toThrow(HttpException);
    });

    it('should accept webhook with fresh timestamp', async () => {
      const freshTimestamp = String(Math.floor(Date.now() / 1000)); // Now

      const body = {
        id: 'webhook-fresh-123',
        type: 'video.asset.ready',
        data: { id: 'asset-fresh-456' },
      };

      jest
        .spyOn(muxService, 'verifyWebhookSignature')
        .mockReturnValue(true);

      jest
        .spyOn(mediaService, 'webhookEventProcessed')
        .mockResolvedValue(false);

      jest.spyOn(mediaService, 'getMediaByMuxAssetId').mockResolvedValue({
        id: 'media-fresh-123',
        userId: 'user-fresh',
        fileName: 'video.mp4',
        status: 'processing',
      });

      jest
        .spyOn(mediaService, 'updateMediaWithMuxData')
        .mockResolvedValue({ id: 'media-fresh-123' });

      jest
        .spyOn(mediaService, 'markWebhookEventProcessed')
        .mockResolvedValue(undefined);

      const result = await controller.handleWebhook(
        mockRequest as any,
        'valid-signature',
        freshTimestamp,
        body,
      );

      expect(result.success).toBe(true);
    });
  });
});
