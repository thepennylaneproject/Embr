/**
 * Mux Video Processing Service
 * Handles video transcoding, playback, and webhook events
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mux from '@mux/mux-node';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface MuxUploadResult {
  uploadId: string;
  uploadUrl: string;
  assetId?: string;
}

export interface MuxAssetDetails {
  assetId: string;
  playbackIds: string[];
  status: 'preparing' | 'ready' | 'errored';
  duration?: number;
  aspectRatio?: string;
  maxStoredResolution?: string;
  maxStoredFrameRate?: number;
  tracks: {
    type: string;
    maxWidth?: number;
    maxHeight?: number;
    maxFrameRate?: number;
  }[];
}

export interface MuxPlaybackInfo {
  playbackId: string;
  playbackUrl: string;
  thumbnailUrl: string;
  gifUrl: string;
  mp4Urls: {
    low: string;
    medium: string;
    high: string;
  };
}

export enum MuxWebhookEvent {
  VIDEO_ASSET_READY = 'video.asset.ready',
  VIDEO_ASSET_ERRORED = 'video.asset.errored',
  VIDEO_ASSET_DELETED = 'video.asset.deleted',
  VIDEO_UPLOAD_ASSET_CREATED = 'video.upload.asset_created',
  VIDEO_UPLOAD_CANCELLED = 'video.upload.cancelled',
  VIDEO_UPLOAD_ERRORED = 'video.upload.errored',
  VIDEO_LIVE_STREAM_ACTIVE = 'video.live_stream.active',
  VIDEO_LIVE_STREAM_IDLE = 'video.live_stream.idle',
}

@Injectable()
export class MuxVideoService {
  private readonly logger = new Logger(MuxVideoService.name);
  private readonly mux: any;
  private readonly webhookSecret: string;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    const tokenId = this.configService.get('MUX_TOKEN_ID');
    const tokenSecret = this.configService.get('MUX_TOKEN_SECRET');
    this.webhookSecret = this.configService.get('MUX_WEBHOOK_SECRET');

    if (!tokenId || !tokenSecret) {
      this.logger.warn('Mux credentials not configured');
    }

    this.mux = new Mux({
      tokenId,
      tokenSecret,
    });
  }

  /**
   * Create a direct upload URL for video files
   */
  async createDirectUpload(
    corsOrigin: string = '*',
    newAssetSettings?: {
      playbackPolicy?: ('public' | 'signed')[];
      mp4Support?: 'none' | 'standard' | 'audio-only';
      normalizeAudio?: boolean;
      maxResolution?: 'low' | 'medium' | 'high';
    },
  ): Promise<MuxUploadResult> {
    try {
      const upload = await this.mux.video.uploads.create({
        cors_origin: corsOrigin,
        new_asset_settings: {
          playback_policy: newAssetSettings?.playbackPolicy || ['public'],
          mp4_support: newAssetSettings?.mp4Support || 'standard',
          normalize_audio: newAssetSettings?.normalizeAudio ?? true,
          max_resolution_tier:
            newAssetSettings?.maxResolution === 'low'
              ? '720p'
              : newAssetSettings?.maxResolution === 'medium'
                ? '1080p'
                : '1440p',
        },
      });

      this.logger.log(`Created Mux direct upload: ${upload.id}`);

      return {
        uploadId: upload.id,
        uploadUrl: upload.url,
        assetId: upload.asset_id,
      };
    } catch (error) {
      this.logger.error('Failed to create Mux upload', error.stack);
      throw error;
    }
  }

  /**
   * Create asset from URL (for already uploaded files)
   */
  async createAssetFromUrl(
    url: string,
    playbackPolicy: ('public' | 'signed')[] = ['public'],
  ): Promise<string> {
    try {
      const asset = await this.mux.video.assets.create({
        input: [{ url }],
        playback_policy: playbackPolicy,
        mp4_support: 'standard',
        normalize_audio: true,
      });

      this.logger.log(`Created Mux asset from URL: ${asset.id}`);

      return asset.id;
    } catch (error) {
      this.logger.error('Failed to create Mux asset from URL', error.stack);
      throw error;
    }
  }

  /**
   * Get asset details
   */
  async getAsset(assetId: string): Promise<MuxAssetDetails> {
    try {
      const asset = await this.mux.video.assets.retrieve(assetId);

      return {
        assetId: asset.id,
        playbackIds: asset.playback_ids?.map((p: any) => p.id) || [],
        status: asset.status,
        duration: asset.duration,
        aspectRatio: asset.aspect_ratio,
        maxStoredResolution: asset.max_stored_resolution,
        maxStoredFrameRate: asset.max_stored_frame_rate,
        tracks: asset.tracks || [],
      };
    } catch (error) {
      this.logger.error(`Failed to get Mux asset ${assetId}`, error.stack);
      throw error;
    }
  }

  /**
   * Get playback information
   */
  async getPlaybackInfo(
    assetId: string,
    playbackPolicy: 'public' | 'signed' = 'public',
  ): Promise<MuxPlaybackInfo> {
    try {
      const asset = await this.mux.video.assets.retrieve(assetId);
      const playbackId = asset.playback_ids?.find(
        (p: any) => p.policy === playbackPolicy,
      )?.id;

      if (!playbackId) {
        throw new Error(`No ${playbackPolicy} playback ID found for asset`);
      }

      return {
        playbackId,
        playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
        thumbnailUrl: this.getThumbnailUrl(playbackId),
        gifUrl: this.getAnimatedGifUrl(playbackId),
        mp4Urls: {
          low: `https://stream.mux.com/${playbackId}/low.mp4`,
          medium: `https://stream.mux.com/${playbackId}/medium.mp4`,
          high: `https://stream.mux.com/${playbackId}/high.mp4`,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get playback info for ${assetId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate thumbnail URL with customization
   */
  getThumbnailUrl(
    playbackId: string,
    options?: {
      width?: number;
      height?: number;
      time?: number;
      fitMode?: 'preserve' | 'crop' | 'smartcrop' | 'pad';
    },
  ): string {
    const params = new URLSearchParams();

    if (options?.width) params.append('width', options.width.toString());
    if (options?.height) params.append('height', options.height.toString());
    if (options?.time) params.append('time', options.time.toString());
    if (options?.fitMode) params.append('fit_mode', options.fitMode);

    const queryString = params.toString();
    return `https://image.mux.com/${playbackId}/thumbnail.jpg${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Generate animated GIF URL
   */
  getAnimatedGifUrl(
    playbackId: string,
    options?: {
      width?: number;
      height?: number;
      fps?: number;
      start?: number;
      end?: number;
    },
  ): string {
    const params = new URLSearchParams();

    if (options?.width) params.append('width', options.width.toString());
    if (options?.height) params.append('height', options.height.toString());
    if (options?.fps) params.append('fps', options.fps.toString());
    if (options?.start) params.append('start', options.start.toString());
    if (options?.end) params.append('end', options.end.toString());

    const queryString = params.toString();
    return `https://image.mux.com/${playbackId}/animated.gif${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Delete asset
   */
  async deleteAsset(assetId: string): Promise<void> {
    try {
      await this.mux.video.assets.delete(assetId);
      this.logger.log(`Deleted Mux asset: ${assetId}`);
    } catch (error) {
      this.logger.error(`Failed to delete Mux asset ${assetId}`, error.stack);
      throw error;
    }
  }

  /**
   * Verify and process Mux webhook
   */
  verifyWebhookSignature(
    rawBody: string,
    signature: string,
    timestamp: string,
  ): boolean {
    try {
      return (Mux as any).webhooks.verifyHeader(
        rawBody,
        signature,
        this.webhookSecret,
        timestamp,
      );
    } catch (error) {
      this.logger.error('Failed to verify webhook signature', error.stack);
      return false;
    }
  }

  /**
   * Process webhook event
   */
  async processWebhook(event: any): Promise<void> {
    const eventType = event.type as MuxWebhookEvent;
    const data = event.data;

    this.logger.log(`Processing Mux webhook: ${eventType}`);

    switch (eventType) {
      case MuxWebhookEvent.VIDEO_ASSET_READY:
        await this.handleAssetReady(data);
        break;

      case MuxWebhookEvent.VIDEO_ASSET_ERRORED:
        await this.handleAssetErrored(data);
        break;

      case MuxWebhookEvent.VIDEO_UPLOAD_ASSET_CREATED:
        await this.handleUploadAssetCreated(data);
        break;

      case MuxWebhookEvent.VIDEO_UPLOAD_ERRORED:
        await this.handleUploadErrored(data);
        break;

      default:
        this.logger.log(`Unhandled webhook event: ${eventType}`);
    }
  }

  /**
   * Handle asset ready event
   */
  private async handleAssetReady(data: any): Promise<void> {
    const assetId = data.id;
    const playbackIds = data.playback_ids?.map((p: any) => p.id) || [];

    this.logger.log(`Asset ready: ${assetId}`);

    // Emit event for other services to handle
    this.eventEmitter.emit('mux.asset.ready', {
      assetId,
      playbackIds,
      duration: data.duration,
      aspectRatio: data.aspect_ratio,
    });
  }

  /**
   * Handle asset error event
   */
  private async handleAssetErrored(data: any): Promise<void> {
    const assetId = data.id;
    const errors = data.errors || [];

    this.logger.error(`Asset errored: ${assetId}`, errors);

    this.eventEmitter.emit('mux.asset.errored', {
      assetId,
      errors,
    });
  }

  /**
   * Handle upload asset created event
   */
  private async handleUploadAssetCreated(data: any): Promise<void> {
    const uploadId = data.id;
    const assetId = data.asset_id;

    this.logger.log(`Upload asset created: ${uploadId} -> ${assetId}`);

    this.eventEmitter.emit('mux.upload.completed', {
      uploadId,
      assetId,
    });
  }

  /**
   * Handle upload error event
   */
  private async handleUploadErrored(data: any): Promise<void> {
    const uploadId = data.id;
    const error = data.error;

    this.logger.error(`Upload errored: ${uploadId}`, error);

    this.eventEmitter.emit('mux.upload.errored', {
      uploadId,
      error,
    });
  }

  /**
   * Create signed playback URL (for private videos)
   */
  async createSignedPlaybackUrl(
    playbackId: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const token = await this.mux.jwt.signPlaybackId(playbackId, {
        type: 'video',
        expiration: Math.floor(Date.now() / 1000) + expiresIn,
      });

      return `https://stream.mux.com/${playbackId}.m3u8?token=${token}`;
    } catch (error) {
      this.logger.error('Failed to create signed playback URL', error.stack);
      throw error;
    }
  }
}
