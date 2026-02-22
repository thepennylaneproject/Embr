import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './core/database/prisma.module';
import { EmailModule } from './core/email/email.module';
import { AuthModule } from './core/auth/auth.module';
import { JwtAuthGuard } from './core/auth/guards/jwt-auth.guard';
import { UsersModule } from './core/users/users.module';
import { ContentModule } from './verticals/feeds/content/content.module';
import { MediaModule } from './core/media/media.module';
import { MonetizationModule } from './core/monetization/monetization.module';
import { GigsModule } from './verticals/gigs/gigs.module';
import { SocialGraphModule } from './verticals/feeds/social-graph/social-graph.module';
import { MessagingModule } from './verticals/messaging/messaging/messaging.module';
import { SafetyModule } from './core/safety/safety.module';
import { NotificationsModule } from './core/notifications/notifications.module';
import { MusicModule } from './music/music.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],  // root .env works from both apps/api and monorepo root
    }),
    
    // Rate limiting - relaxed for development
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 second
        limit: 60,   // 60 req/s — accommodates React Strict Mode double-invocations
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 seconds
        limit: 300,  // 300 per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000,  // 1 minute
        limit: 1000, // 1000 per minute
      },
    ]),
    
    PrismaModule,
    EmailModule,
    AuthModule,
    UsersModule,
    ContentModule,
    MediaModule,
    MonetizationModule,
    GigsModule,
    SocialGraphModule,
    MessagingModule,
    SafetyModule,
    NotificationsModule,
    MusicModule,
  ],
  providers: [
    // Global rate limiting guard (runs before auth)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global JWT auth guard — routes opt out with @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}


