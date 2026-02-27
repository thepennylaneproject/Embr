/**
 * Redis Module
 * Provides Redis service for caching and Socket.io adapter
 */

import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
