/**
 * Unit tests for MessageRateLimiterService
 * Tests token bucket algorithm and rate limiting logic
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { MessageRateLimiterService } from '../services/message-rate-limiter.service';
import { toRateLimitConfig, MESSAGE_RATE_LIMITS } from '../config/messaging-rate-limits';

describe('MessageRateLimiterService', () => {
  let service: MessageRateLimiterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageRateLimiterService],
    }).compile();

    service = module.get<MessageRateLimiterService>(MessageRateLimiterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isAllowed', () => {
    it('should allow message when under rate limit', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';

      // First message should always be allowed
      await expect(
        service.isAllowed(
          userId,
          conversationId,
          toRateLimitConfig(MESSAGE_RATE_LIMITS.USER_PER_CONVERSATION),
        ),
      ).resolves.toBeUndefined();
    });

    it('should throw when exceeding rate limit', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';
      const config = {
        maxTokens: 2,
        refillRate: 2 / 60000, // 2 messages per minute
        windowMs: 60000,
      };

      // Allow first two messages
      await service.isAllowed(userId, conversationId, config);
      await service.isAllowed(userId, conversationId, config);

      // Third should be rejected
      await expect(
        service.isAllowed(userId, conversationId, config),
      ).rejects.toThrow(HttpException);
    });

    it('should track separate limits per conversation', async () => {
      const userId = 'user-123';
      const conv1 = 'conv-1';
      const conv2 = 'conv-2';
      const config = {
        maxTokens: 1,
        refillRate: 1 / 60000,
        windowMs: 60000,
      };

      // First conversation: allow one message
      await service.isAllowed(userId, conv1, config);

      // Second conversation: should also allow one message
      await service.isAllowed(userId, conv2, config);

      // Both are now at limit
      await expect(service.isAllowed(userId, conv1, config)).rejects.toThrow();
      await expect(service.isAllowed(userId, conv2, config)).rejects.toThrow();
    });

    it('should track separate limits per user', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const conversationId = 'conv-123';
      const config = {
        maxTokens: 1,
        refillRate: 1 / 60000,
        windowMs: 60000,
      };

      // Both users should be able to send one message to same conversation
      await service.isAllowed(user1, conversationId, config);
      await service.isAllowed(user2, conversationId, config);

      // Both should now be at limit
      await expect(service.isAllowed(user1, conversationId, config)).rejects.toThrow();
      await expect(service.isAllowed(user2, conversationId, config)).rejects.toThrow();
    });

    it('should allow messages after token refill', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';
      const config = {
        maxTokens: 1,
        refillRate: 1000 / 1000, // 1000 tokens per second (fast refill for testing)
        windowMs: 1000,
      };

      // First message allowed
      await service.isAllowed(userId, conversationId, config);

      // Should be rate limited immediately after
      await expect(service.isAllowed(userId, conversationId, config)).rejects.toThrow();

      // Wait for token refill
      await new Promise((resolve) => setTimeout(resolve, 1010));

      // Should be allowed again
      await expect(
        service.isAllowed(userId, conversationId, config),
      ).resolves.toBeUndefined();
    });

    it('should handle rapid-fire requests correctly', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';
      const config = {
        maxTokens: 5,
        refillRate: 5 / 1000, // 5 tokens per second
        windowMs: 1000,
      };

      // Should allow 5 rapid requests
      for (let i = 0; i < 5; i++) {
        await expect(
          service.isAllowed(userId, conversationId, config),
        ).resolves.toBeUndefined();
      }

      // 6th should fail
      await expect(service.isAllowed(userId, conversationId, config)).rejects.toThrow();
    });
  });

  describe('getRemainingTokens', () => {
    it('should return full tokens for new bucket', () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';
      const config = toRateLimitConfig(MESSAGE_RATE_LIMITS.USER_PER_CONVERSATION);

      const remaining = service.getRemainingTokens(userId, conversationId, config);
      expect(remaining).toBe(config.maxTokens);
    });

    it('should return decremented tokens after message', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';
      const config = toRateLimitConfig(MESSAGE_RATE_LIMITS.USER_PER_CONVERSATION);

      await service.isAllowed(userId, conversationId, config);
      const remaining = service.getRemainingTokens(userId, conversationId, config);

      expect(remaining).toBe(config.maxTokens - 1);
    });

    it('should reflect token refill over time', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';
      const config = {
        maxTokens: 10,
        refillRate: 100 / 1000, // 100 tokens per second
        windowMs: 1000,
      };

      // Consume some tokens
      await service.isAllowed(userId, conversationId, config);
      await service.isAllowed(userId, conversationId, config);
      let remaining = service.getRemainingTokens(userId, conversationId, config);
      expect(remaining).toBe(8);

      // Wait and check refill
      await new Promise((resolve) => setTimeout(resolve, 100));
      remaining = service.getRemainingTokens(userId, conversationId, config);

      // Should have gained approximately 10 tokens
      expect(remaining).toBeGreaterThan(8);
    });
  });

  describe('resetLimit', () => {
    it('should reset rate limit for user and conversation', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';
      const config = {
        maxTokens: 1,
        refillRate: 1 / 60000,
        windowMs: 60000,
      };

      // Consume the token
      await service.isAllowed(userId, conversationId, config);

      // Should be rate limited
      await expect(service.isAllowed(userId, conversationId, config)).rejects.toThrow();

      // Reset
      service.resetLimit(userId, conversationId);

      // Should now be allowed again
      await expect(
        service.isAllowed(userId, conversationId, config),
      ).resolves.toBeUndefined();
    });
  });

  describe('cleanupStaleBuckets', () => {
    it('should remove buckets older than 1 hour', async () => {
      const userId1 = 'user-1';
      const conversationId1 = 'conv-1';
      const config = toRateLimitConfig(MESSAGE_RATE_LIMITS.USER_PER_CONVERSATION);

      // Create a bucket by calling isAllowed (getRemainingTokens does not create one)
      await service.isAllowed(userId1, conversationId1, config);

      // Manually age the bucket
      const bucketKey = `${userId1}:${conversationId1}`;
      const bucket = (service as any).buckets.get(bucketKey);
      bucket.lastRefillTime = Date.now() - 61 * 60 * 1000; // 61 minutes ago

      // Cleanup
      service.cleanupStaleBuckets();

      // Bucket should be gone; getRemainingTokens returns maxTokens for an absent bucket
      const remaining = service.getRemainingTokens(userId1, conversationId1, config);
      expect(remaining).toBe(config.maxTokens); // Should be treated as new bucket
    });

    it('should keep recent buckets', async () => {
      const userId1 = 'user-1';
      const conversationId1 = 'conv-1';
      const config = toRateLimitConfig(MESSAGE_RATE_LIMITS.USER_PER_CONVERSATION);

      // Create a bucket and consume a token
      await service.isAllowed(userId1, conversationId1, config);

      // Cleanup (bucket is recent)
      service.cleanupStaleBuckets();

      // Bucket should still be there
      const remaining = service.getRemainingTokens(userId1, conversationId1, config);
      expect(remaining).toBe(config.maxTokens - 1);
    });
  });

  describe('rate limit disabled', () => {
    it('should allow unlimited messages when disabled', async () => {
      // Save original env
      const originalEnv = process.env.MESSAGING_RATE_LIMIT_ENABLED;

      // Create new instance with disabled rate limiting
      process.env.MESSAGING_RATE_LIMIT_ENABLED = 'false';
      const disabledService = new MessageRateLimiterService();

      const userId = 'user-123';
      const conversationId = 'conv-123';
      const config = {
        maxTokens: 1,
        refillRate: 1 / 60000,
        windowMs: 60000,
      };

      // Should allow unlimited messages even with limited tokens
      for (let i = 0; i < 100; i++) {
        await expect(
          disabledService.isAllowed(userId, conversationId, config),
        ).resolves.toBeUndefined();
      }

      // Restore original env
      process.env.MESSAGING_RATE_LIMIT_ENABLED = originalEnv;
    });
  });

  describe('configuration', () => {
    it('should convert messagesPerMinute to token bucket config correctly', () => {
      // toRateLimitConfig translates { messagesPerMinute, windowMs } into
      // { maxTokens, refillRate, windowMs }. Verify the conversion is correct.
      const config = toRateLimitConfig({ messagesPerMinute: 30, windowMs: 30000 });

      expect(config.maxTokens).toBe(30);
      expect(config.windowMs).toBe(30000);
      // refillRate should be tokens per millisecond: 30 / 30000 = 0.001
      expect(config.refillRate).toBeCloseTo(30 / 30000);
    });
  });
});
