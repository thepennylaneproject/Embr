import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { PrismaModule } from '../core/database/prisma.module';
import { MediaModule } from '../core/media/media.module';
import musicRoutes from './routes';

/**
 * Music Module
 *
 * Handles all music vertical functionality:
 * - Artist profiles and management
 * - Track creation, publishing, and management
 * - Music licensing and usage tracking
 * - Revenue tracking and reporting
 * - Music search and discovery
 *
 * Routes:
 * - POST/GET/PUT /api/music/artists - Artist management
 * - POST/GET/PUT /api/music/tracks - Track management
 * - GET/POST /api/music/licensing - Licensing checks and usage tracking
 * - POST/GET/PUT /api/music/stream - Streaming and revenue tracking
 *
 * Integrates with:
 * - Monetization (for revenue tracking)
 * - Media (for file uploads)
 * - Feeds (for music integration in posts)
 */
@Module({
  imports: [PrismaModule, MediaModule],
})
export class MusicModule {
  /**
   * Register Express routes with NestJS
   * This allows the existing Express route handlers to work within
   * the NestJS module system while preserving backward compatibility.
   *
   * Future: Convert these to proper NestJS @Controller() classes.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(musicRoutes).forRoutes({
      path: 'music/*',
      method: RequestMethod.ALL,
    });
  }
}
