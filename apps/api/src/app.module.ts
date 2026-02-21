import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './modules/prisma/prisma.module';
import { EmailModule } from './modules/email/email.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { UsersModule } from './modules/users/users.module';
import { ContentModule } from './modules/content/content.module';
import { MediaModule } from './modules/media/media.module';
import { MonetizationModule } from './modules/monetization/monetization.module';
import { GigsModule } from './modules/gigs/gigs.module';
import { SocialGraphModule } from './modules/social-graph/social-graph.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { SafetyModule } from './modules/safety/safety.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

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


