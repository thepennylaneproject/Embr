/**
 * Mux Webhook Controller
 * Handles webhook callbacks from Mux for video processing events
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MuxVideoService } from '../services/mux-video.service';
import { MediaService } from '../services/media.service';
import { ThumbnailService } from '../services/thumbnail.service';
import { Request } from 'express';

@ApiTags('Webhooks')
@Controller('webhooks/mux')
export class MuxWebhookController {
  private readonly logger = new Logger(MuxWebhookController.name);

  constructor(
    private muxService: MuxVideoService,
    private mediaService: MediaService,
    private thumbnailService: ThumbnailService,
  ) {}

  /**
   * Handle Mux webhook events
   */
  @Post()
  @ApiOperation({ summary: 'Handle Mux webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('mux-signature') signature: string,
    @Headers('mux-timestamp') timestamp: string,
    @Body() body: any,
  ) {
    this.logger.log(`Received Mux webhook: ${body.type}`);

    // Verify webhook signature
    const rawBody = request.rawBody?.toString('utf8') || JSON.stringify(body);
    const isValid = this.muxService.verifyWebhookSignature(
      rawBody,
      signature,
      timestamp,
    );

    if (!isValid) {
      this.logger.error('Invalid webhook signature');
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    // Process webhook event
    try {
      await this.processWebhookEvent(body);

      return {
        success: true,
        message: 'Webhook processed',
      };
    } catch (error) {
      this.logger.error('Failed to process webhook', error.stack);
      throw new HttpException(
        'Failed to process webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Process different webhook event types
   */
  private async processWebhookEvent(event: any): Promise<void> {
    const eventType = event.type;
    const data = event.data;

    switch (eventType) {
      case 'video.asset.ready':
        await this.handleAssetReady(data);
        break;

      case 'video.asset.errored':
        await this.handleAssetErrored(data);
        break;

      case 'video.asset.deleted':
        await this.handleAssetDeleted(data);
        break;

      case 'video.upload.asset_created':
        await this.handleUploadAssetCreated(data);
        break;

      case 'video.upload.cancelled':
        await this.handleUploadCancelled(data);
        break;

      case 'video.upload.errored':
        await this.handleUploadErrored(data);
        break;

      default:
        this.logger.log(`Unhandled webhook event: ${eventType}`);
    }
  }

  /**
   * Handle video.asset.ready event
   */
  private async handleAssetReady(data: any): Promise<void> {
    const assetId = data.id;
    const playbackIds = data.playback_ids || [];

    this.logger.log(`Processing asset.ready for ${assetId}`);

    try {
      // Get media record by Mux asset ID
      const media = await this.mediaService.getMediaByMuxAssetId(assetId);

      if (!media) {
        this.logger.warn(`No media record found for asset ${assetId}`);
        return;
      }

      // Extract playback ID (typically the first public one)
      const playbackId = playbackIds.find((p: any) => p.policy === 'public')?.id;

      if (!playbackId) {
        this.logger.error(`No public playback ID found for asset ${assetId}`);
        return;
      }

      // Generate thumbnail from video
      const thumbnail = await this.thumbnailService.generateVideoThumbnail(
        playbackId,
        {
          width: 1280,
          height: 720,
          time: 0,
          format: 'jpeg',
          quality: 85,
        },
      );

      // Update media record with playback info and thumbnail
      await this.mediaService.updateMediaWithMuxData(media.id, {
        muxAssetId: assetId,
        muxPlaybackId: playbackId,
        playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
        thumbnailUrl: thumbnail.thumbnailUrl,
        thumbnailKey: thumbnail.thumbnailKey,
        duration: data.duration,
        aspectRatio: data.aspect_ratio,
        status: 'completed',
        completedAt: new Date(),
      });

      this.logger.log(`Updated media ${media.id} with Mux data`);
    } catch (error) {
      this.logger.error(
        `Failed to process asset.ready for ${assetId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle video.asset.errored event
   */
  private async handleAssetErrored(data: any): Promise<void> {
    const assetId = data.id;
    const errors = data.errors || [];

    this.logger.error(`Asset errored: ${assetId}`, errors);

    try {
      const media = await this.mediaService.getMediaByMuxAssetId(assetId);

      if (media) {
        await this.mediaService.updateMediaStatus(media.id, 'error', {
          errorMessage: JSON.stringify(errors),
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to process asset.errored for ${assetId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle video.asset.deleted event
   */
  private async handleAssetDeleted(data: any): Promise<void> {
    const assetId = data.id;

    this.logger.log(`Asset deleted: ${assetId}`);

    try {
      const media = await this.mediaService.getMediaByMuxAssetId(assetId);

      if (media) {
        await this.mediaService.updateMediaStatus(media.id, 'deleted');
      }
    } catch (error) {
      this.logger.error(
        `Failed to process asset.deleted for ${assetId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle video.upload.asset_created event
   */
  private async handleUploadAssetCreated(data: any): Promise<void> {
    const uploadId = data.id;
    const assetId = data.asset_id;

    this.logger.log(`Upload asset created: ${uploadId} -> ${assetId}`);

    try {
      const media = await this.mediaService.getMediaByUploadId(uploadId);

      if (media) {
        await this.mediaService.updateMedia(media.id, {
          muxAssetId: assetId,
          status: 'processing',
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to process upload.asset_created for ${uploadId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle video.upload.cancelled event
   */
  private async handleUploadCancelled(data: any): Promise<void> {
    const uploadId = data.id;

    this.logger.log(`Upload cancelled: ${uploadId}`);

    try {
      const media = await this.mediaService.getMediaByUploadId(uploadId);

      if (media) {
        await this.mediaService.updateMediaStatus(media.id, 'cancelled');
      }
    } catch (error) {
      this.logger.error(
        `Failed to process upload.cancelled for ${uploadId}`,
        error.stack,
      );
    }
  }

  /**
   * Handle video.upload.errored event
   */
  private async handleUploadErrored(data: any): Promise<void> {
    const uploadId = data.id;
    const error = data.error;

    this.logger.error(`Upload errored: ${uploadId}`, error);

    try {
      const media = await this.mediaService.getMediaByUploadId(uploadId);

      if (media) {
        await this.mediaService.updateMediaStatus(media.id, 'error', {
          errorMessage: JSON.stringify(error),
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to process upload.errored for ${uploadId}`,
        error.stack,
      );
    }
  }
}
