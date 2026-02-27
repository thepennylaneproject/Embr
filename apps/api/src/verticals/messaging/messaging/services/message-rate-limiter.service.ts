/**
 * Message Rate Limiter Service
 * Implements token bucket algorithm for rate limiting message sends
 */

import { Injectable, TooManyRequestsException } from '@nestjs/common';

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

  private readonly DEFAULT_LIMITS = {
    // Per-user per-conversation limits
    USER_PER_CONVERSATION: {
      maxTokens: 60,
      refillRate: 60 / 60000, // 60 messages per minute = 1 per second
      windowMs: 60000,
    },
    // Burst limit (per second)
    BURST_LIMIT: {
      maxTokens: 5,
      refillRate: 5 / 1000, // 5 messages per second
      windowMs: 1000,
    },
  };

  constructor() {
    // Allow disabling rate limiting via environment variable
    if (!this.rateLimitEnabled) {
      console.log('[MessageRateLimiterService] Rate limiting is disabled');
    }
  }

  /**
   * Check if a message send is allowed for the given user and conversation
   * @param userId - The user sending the message
   * @param conversationId - The conversation the message is being sent to
   * @param config - Optional custom rate limit configuration
   * @returns true if allowed, throws TooManyRequestsException if rate limited
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

    // Create composite key: userId:conversationId
    const bucketKey = `${userId}:${conversationId}`;

    // Get or create bucket
    let bucket = this.buckets.get(bucketKey);
    const now = Date.now();

    if (!bucket) {
      bucket = {
        tokens: limits.maxTokens,
        lastRefillTime: now,
      };
      this.buckets.set(bucketKey, bucket);
    } else {
      // Refill tokens based on time elapsed
      const timePassed = now - bucket.lastRefillTime;
      const tokensToAdd = timePassed * limits.refillRate;
      bucket.tokens = Math.min(limits.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefillTime = now;
    }

    // Check if we have tokens available
    if (bucket.tokens < 1) {
      const resetTime = this.getResetTime(bucketKey, limits);
      throw new TooManyRequestsException(
        `Rate limit exceeded. Try again in ${resetTime}ms`,
      );
    }

    // Consume one token
    bucket.tokens -= 1;
  }

  /**
   * Get remaining tokens for a user in a conversation
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @param config - Optional custom rate limit configuration
   * @returns Number of remaining tokens
   */
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

  /**
   * Get the time in milliseconds until the rate limit resets
   * @param bucketKey - The bucket key (userId:conversationId)
   * @param limits - The rate limit configuration
   * @returns Time in milliseconds until reset
   */
  private getResetTime(bucketKey: string, limits: RateLimitConfig): number {
    const bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      return 0;
    }

    // Time needed to refill one token
    const timePerToken = 1 / limits.refillRate;
    return Math.ceil(timePerToken);
  }

  /**
   * Reset rate limit for a user and conversation
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   */
  resetLimit(userId: string, conversationId: string): void {
    const bucketKey = `${userId}:${conversationId}`;
    this.buckets.delete(bucketKey);
  }

  /**
   * Cleanup stale buckets (older than 1 hour)
   * Call this periodically to prevent memory leaks
   */
  cleanupStaleBuckets(): void {
    const now = Date.now();
    const MAX_AGE = 60 * 60 * 1000; // 1 hour

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefillTime > MAX_AGE) {
        this.buckets.delete(key);
      }
    }
  }
}
