import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessagingController } from './controllers/messaging.controller';
import { MessagingService } from './services/messaging.service';
import { MessagingGateway } from './gateways/messaging.gateway';
import { MessageRateLimiterService } from './services/message-rate-limiter.service';
import { ConversationAccessService } from './services/conversation-access.service';
import { RedisModule } from '../../../core/redis/redis.module';
import { RedisService } from '../../../core/redis/redis.service';
import { RedisIoAdapter } from '../../../core/redis/redis-io.adapter';
import { UploadModule } from '../../../core/upload/upload.module';

@Module({
  imports: [
    UploadModule,
    RedisModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [MessagingController],
  providers: [
    MessagingService,
    MessagingGateway,
    MessageRateLimiterService,
    ConversationAccessService,
  ],
  exports: [
    MessagingService,
    MessagingGateway,
    MessageRateLimiterService,
    ConversationAccessService,
  ],
})
export class MessagingModule implements OnModuleInit {
  constructor(
    private redisService: RedisService,
    private messagingGateway: MessagingGateway,
  ) {}

  async onModuleInit() {
    // Initialize Redis adapter for messaging gateway if Redis is available
    try {
      const isHealthy = await this.redisService.healthCheck();
      if (isHealthy) {
        const { pubClient, subClient } = this.redisService.getPubSubClients();
        const adapter = new RedisIoAdapter(pubClient, subClient);
        this.messagingGateway.setRedisAdapter(adapter, this.redisService);
      }
    } catch (error) {
      console.warn(`Redis adapter initialization failed, falling back to in-memory: ${error.message}`);
    }
  }
}
