/**
 * Message Rate Limiter Service
 * Token bucket (in-process) with optional Redis fixed-window counters for
 * multi-instance deployments (f-perf-014).
 */

import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
} from '@nestjs/common';
import { RedisService } from '../../../../core/redis/redis.service';

interface TokenBucket {
  tokens: number;
  lastRefillTime: number;
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per millisecond
  windowMs: number;
}

@Injectable()
export class MessageRateLimiterService {
  private buckets: Map<string, TokenBucket> = new Map();
  private rateLimitEnabled: boolean = process.env.MESSAGING_RATE_LIMIT_ENABLED !== 'false';
  private readonly logger = new Logger(MessageRateLimiterService.name);

  private redisRateLimitChecked = false;
  private useRedisForLimits = false;

  private readonly DEFAULT_LIMITS = {
    USER_PER_CONVERSATION: {
      maxTokens: 60,
      refillRate: 60 / 60000,
      windowMs: 60000,
    },
    BURST_LIMIT: {
      maxTokens: 5,
      refillRate: 5 / 1000,
      windowMs: 1000,
    },
  };

  constructor(@Optional() private readonly redisService?: RedisService) {
    if (!this.rateLimitEnabled) {
      this.logger.warn('Rate limiting is disabled');
    }
  }

  /**
   * When Redis is healthy, enforce limits with a fixed-window counter so all API
   * instances share the same counts. Mirrors approximate remaining tokens into
   * the in-memory bucket for getRemainingTokens().
   */
  private async tryRedisLimit(
    userId: string,
    conversationId: string,
    limits: RateLimitConfig,
  ): Promise<boolean> {
    if (!this.redisService || process.env.MESSAGING_RATE_LIMIT_REDIS === 'false') {
      return false;
    }

    if (!this.redisRateLimitChecked) {
      try {
        this.useRedisForLimits = await this.redisService.healthCheck();
      } catch {
        this.useRedisForLimits = false;
      }
      this.redisRateLimitChecked = true;
      if (this.useRedisForLimits) {
        this.logger.log('Message send rate limits use Redis (multi-instance)');
      }
    }

    if (!this.useRedisForLimits) {
      return false;
    }

    const windowId = Math.floor(Date.now() / limits.windowMs);
    const key = `msg:rl:${userId}:${conversationId}:${windowId}`;
    const ttl = Math.ceil(limits.windowMs / 1000) + 10;
    const count = await this.redisService.incrementWithTtl(key, ttl);

    if (count > limits.maxTokens) {
      throw new HttpException(
        'Too many messages sent. Please wait before sending more.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const bucketKey = `${userId}:${conversationId}`;
    this.buckets.set(bucketKey, {
      tokens: Math.max(0, limits.maxTokens - count),
      lastRefillTime: Date.now(),
    });

    return true;
  }

  /**
   * Check if a message send is allowed for the given user and conversation
   */
  async isAllowed(
    userId: string,
    conversationId: string,
    config?: RateLimitConfig,
  ): Promise<void> {
    if (!this.rateLimitEnabled) {
      return;
    }

    const limits = config || this.DEFAULT_LIMITS.USER_PER_CONVERSATION;

    if (this.redisService) {
      try {
        const usedRedis = await this.tryRedisLimit(userId, conversationId, limits);
        if (usedRedis) {
          return;
        }
      } catch (e) {
        if (e instanceof HttpException) {
          throw e;
        }
        this.logger.warn(
          `Redis message rate limit error; using in-memory bucket: ${e instanceof Error ? e.message : String(e)}`,
        );
        this.useRedisForLimits = false;
      }
    }

    const bucketKey = `${userId}:${conversationId}`;
    let bucket = this.buckets.get(bucketKey);
    const now = Date.now();

    if (!bucket) {
      bucket = {
        tokens: limits.maxTokens,
        lastRefillTime: now,
      };
      this.buckets.set(bucketKey, bucket);
    } else {
      const timePassed = now - bucket.lastRefillTime;
      const tokensToAdd = timePassed * limits.refillRate;
      bucket.tokens = Math.min(limits.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefillTime = now;
    }

    if (bucket.tokens < 1) {
      throw new HttpException(
        'Too many messages sent. Please wait before sending more.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.tokens -= 1;
  }

  getRemainingTokens(
    userId: string,
    conversationId: string,
    config?: RateLimitConfig,
  ): number {
    if (!this.rateLimitEnabled) {
      return Infinity;
    }

    const limits = config || this.DEFAULT_LIMITS.USER_PER_CONVERSATION;
    const bucketKey = `${userId}:${conversationId}`;
    const bucket = this.buckets.get(bucketKey);

    if (!bucket) {
      return limits.maxTokens;
    }

    const now = Date.now();
    const timePassed = now - bucket.lastRefillTime;
    const tokensToAdd = timePassed * limits.refillRate;
    const currentTokens = Math.min(limits.maxTokens, bucket.tokens + tokensToAdd);

    return Math.floor(currentTokens);
  }

  resetLimit(userId: string, conversationId: string): void {
    const bucketKey = `${userId}:${conversationId}`;
    this.buckets.delete(bucketKey);

    if (this.redisService && this.useRedisForLimits) {
      const limits = this.DEFAULT_LIMITS.USER_PER_CONVERSATION;
      const w = Math.floor(Date.now() / limits.windowMs);
      void this.redisService.del(`msg:rl:${userId}:${conversationId}:${w}`).catch(() => {});
      void this.redisService.del(`msg:rl:${userId}:${conversationId}:${w - 1}`).catch(() => {});
    }
  }

  cleanupStaleBuckets(): void {
    const now = Date.now();
    const MAX_AGE = 60 * 60 * 1000;

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefillTime > MAX_AGE) {
        this.buckets.delete(key);
      }
    }
  }
}
