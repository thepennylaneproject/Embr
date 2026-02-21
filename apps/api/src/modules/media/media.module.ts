/**
 * Media Module
 * NestJS module for media upload and processing
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MediaUploadController } from './controllers/media-upload.controller';
import { MuxWebhookController } from './controllers/mux-webhook.controller';
import { S3MultipartService } from './services/s3-multipart.service';
import { MuxVideoService } from './services/mux-video.service';
import { ThumbnailService } from './services/thumbnail.service';
import { MediaService } from './services/media.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    PrismaModule,
  ],
  controllers: [
    MediaUploadController,
    MuxWebhookController,
  ],
  providers: [
    S3MultipartService,
    MuxVideoService,
    ThumbnailService,
    MediaService,
  ],
  exports: [
    S3MultipartService,
    MuxVideoService,
    ThumbnailService,
    MediaService,
  ],
})
export class MediaModule {}
