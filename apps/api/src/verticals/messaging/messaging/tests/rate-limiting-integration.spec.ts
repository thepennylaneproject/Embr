/**
 * Integration tests for rate limiting in messaging
 * Tests rate limiting in REST API and WebSocket contexts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, TooManyRequestsException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagingService } from '../services/messaging.service';
import { MessageRateLimiterService } from '../services/message-rate-limiter.service';
import { SendMessageDto } from '../dto/messaging.dto';
import { PrismaService } from '../../../../core/database/prisma.service';

describe('Rate Limiting Integration Tests', () => {
  let messagingService: MessagingService;
  let rateLimiterService: MessageRateLimiterService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockUserId = 'test-user-123';
  const mockConversationId = 'test-conv-123';
  const mockRecipientId = 'recipient-user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MessagingService,
          useValue: {
            sendMessage: jest.fn(),
            getOrCreateConversation: jest.fn(),
            getConversations: jest.fn(),
          },
        },
        MessageRateLimiterService,
        {
          provide: PrismaService,
          useValue: {
            message: {
              create: jest.fn(),
            },
            conversation: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    messagingService = module.get<MessagingService>(MessagingService);
    rateLimiterService = module.get<MessageRateLimiterService>(MessageRateLimiterService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('sendMessage with rate limiting', () => {
    it('should allow sending message when under rate limit', async () => {
      const dto: SendMessageDto = {
        conversationId: mockConversationId,
        content: 'Test message',
        type: 'TEXT' as any,
      };

      // Mock prisma calls
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue({
        id: mockConversationId,
        participant1Id: mockUserId,
        participant2Id: mockRecipientId,
        participant1: { id: mockUserId, username: 'testuser' },
        participant2: { id: mockRecipientId, username: 'recipient' },
      });

      (prismaService.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-123',
        conversationId: mockConversationId,
        senderId: mockUserId,
        content: 'Test message',
        type: 'TEXT',
        status: 'SENT',
        createdAt: new Date(),
        sender: { id: mockUserId, username: 'testuser', profile: {} },
      });

      // Should not throw
      const result = await messagingService.sendMessage(mockUserId, dto);
      expect(result).toBeDefined();
    });

    it('should throw rate limit error when exceeding limit', async () => {
      const config = {
        maxTokens: 1,
        refillRate: 1 / 60000,
        windowMs: 60000,
      };

      // Consume the token
      await rateLimiterService.isAllowed(mockUserId, mockConversationId, config);

      // Next call should throw
      await expect(
        rateLimiterService.isAllowed(mockUserId, mockConversationId, config),
      ).rejects.toThrow(TooManyRequestsException);
    });

    it('should track rate limits across different conversations', async () => {
      const conv1 = 'conversation-1';
      const conv2 = 'conversation-2';
      const config = {
        maxTokens: 2,
        refillRate: 2 / 60000,
        windowMs: 60000,
      };

      // Send 2 messages to conversation 1
      await rateLimiterService.isAllowed(mockUserId, conv1, config);
      await rateLimiterService.isAllowed(mockUserId, conv1, config);

      // Should be limited in conversation 1
      await expect(
        rateLimiterService.isAllowed(mockUserId, conv1, config),
      ).rejects.toThrow();

      // But should still be able to send to conversation 2
      await rateLimiterService.isAllowed(mockUserId, conv2, config);
      await rateLimiterService.isAllowed(mockUserId, conv2, config);

      // Should also be limited in conversation 2
      await expect(
        rateLimiterService.isAllowed(mockUserId, conv2, config),
      ).rejects.toThrow();
    });

    it('should track rate limits separately for different users', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const config = {
        maxTokens: 1,
        refillRate: 1 / 60000,
        windowMs: 60000,
      };

      // User 1 sends a message
      await rateLimiterService.isAllowed(user1, mockConversationId, config);

      // User 1 should be limited
      await expect(
        rateLimiterService.isAllowed(user1, mockConversationId, config),
      ).rejects.toThrow();

      // But user 2 should still be able to send
      await expect(
        rateLimiterService.isAllowed(user2, mockConversationId, config),
      ).resolves.toBeUndefined();
    });
  });

  describe('rate limit recovery', () => {
    it('should allow messages after rate limit resets', async () => {
      const config = {
        maxTokens: 1,
        refillRate: 10000 / 1000, // 10000 tokens per second for fast testing
        windowMs: 1000,
      };

      const testKey = `${mockUserId}:test-conv-recovery`;

      // First message allowed
      await rateLimiterService.isAllowed(mockUserId, 'test-conv-recovery', config);

      // Second should fail
      await expect(
        rateLimiterService.isAllowed(mockUserId, 'test-conv-recovery', config),
      ).rejects.toThrow();

      // Wait for token refill
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      await expect(
        rateLimiterService.isAllowed(mockUserId, 'test-conv-recovery', config),
      ).resolves.toBeUndefined();
    });

    it('should support manual reset of rate limits', async () => {
      const config = {
        maxTokens: 1,
        refillRate: 1 / 60000,
        windowMs: 60000,
      };

      // Consume token
      await rateLimiterService.isAllowed(mockUserId, mockConversationId, config);

      // Should be rate limited
      await expect(
        rateLimiterService.isAllowed(mockUserId, mockConversationId, config),
      ).rejects.toThrow();

      // Reset manually
      rateLimiterService.resetLimit(mockUserId, mockConversationId);

      // Should be allowed again
      await expect(
        rateLimiterService.isAllowed(mockUserId, mockConversationId, config),
      ).resolves.toBeUndefined();
    });
  });

  describe('remaining tokens tracking', () => {
    it('should accurately track remaining tokens', async () => {
      const config = {
        maxTokens: 5,
        refillRate: 5 / 60000,
        windowMs: 60000,
      };

      const conv = 'tracking-test-conv';

      // Initial state
      let remaining = rateLimiterService.getRemainingTokens(mockUserId, conv, config);
      expect(remaining).toBe(5);

      // After one message
      await rateLimiterService.isAllowed(mockUserId, conv, config);
      remaining = rateLimiterService.getRemainingTokens(mockUserId, conv, config);
      expect(remaining).toBe(4);

      // After three messages
      await rateLimiterService.isAllowed(mockUserId, conv, config);
      await rateLimiterService.isAllowed(mockUserId, conv, config);
      remaining = rateLimiterService.getRemainingTokens(mockUserId, conv, config);
      expect(remaining).toBe(2);
    });

    it('should show tokens refilling over time', async () => {
      const config = {
        maxTokens: 10,
        refillRate: 100 / 1000, // 100 tokens per second
        windowMs: 1000,
      };

      const conv = 'refill-test-conv';

      // Consume some tokens
      await rateLimiterService.isAllowed(mockUserId, conv, config);
      await rateLimiterService.isAllowed(mockUserId, conv, config);
      let remaining = rateLimiterService.getRemainingTokens(mockUserId, conv, config);
      expect(remaining).toBe(8);

      // Wait for tokens to refill
      await new Promise((resolve) => setTimeout(resolve, 100));
      remaining = rateLimiterService.getRemainingTokens(mockUserId, conv, config);

      // Should have more tokens now (approximately 18, but capped at 10)
      expect(remaining).toBeGreaterThan(8);
      expect(remaining).toBeLessThanOrEqual(10);
    });
  });

  describe('burst limit scenario', () => {
    it('should handle burst limit configuration', async () => {
      const burstConfig = {
        maxTokens: 5,
        refillRate: 5 / 1000, // 5 tokens per second
        windowMs: 1000,
      };

      const conv = 'burst-test';

      // Should allow 5 rapid messages
      for (let i = 0; i < 5; i++) {
        await expect(
          rateLimiterService.isAllowed(mockUserId, conv, burstConfig),
        ).resolves.toBeUndefined();
      }

      // 6th should fail
      await expect(
        rateLimiterService.isAllowed(mockUserId, conv, burstConfig),
      ).rejects.toThrow();

      // Wait for one token to refill
      await new Promise((resolve) => setTimeout(resolve, 210));

      // Should be able to send one more
      await expect(
        rateLimiterService.isAllowed(mockUserId, conv, burstConfig),
      ).resolves.toBeUndefined();
    });
  });

  describe('stale bucket cleanup', () => {
    it('should cleanup buckets older than 1 hour', () => {
      const config = {
        maxTokens: 5,
        refillRate: 5 / 60000,
        windowMs: 60000,
      };

      const conv = 'cleanup-test-1';
      const conv2 = 'cleanup-test-2';

      // Create two buckets
      rateLimiterService.getRemainingTokens(mockUserId, conv, config);
      rateLimiterService.getRemainingTokens(mockUserId, conv2, config);

      // Age first bucket
      const bucket1Key = `${mockUserId}:${conv}`;
      const bucket1 = (rateLimiterService as any).buckets.get(bucket1Key);
      bucket1.lastRefillTime = Date.now() - 61 * 60 * 1000;

      // Cleanup
      rateLimiterService.cleanupStaleBuckets();

      // Old bucket should be gone, new one should remain
      let remaining1 = rateLimiterService.getRemainingTokens(mockUserId, conv, config);
      let remaining2 = rateLimiterService.getRemainingTokens(mockUserId, conv2, config);

      expect(remaining1).toBe(config.maxTokens); // Treated as fresh
      expect(remaining2).toBe(config.maxTokens); // Still has full tokens
    });
  });

  describe('edge cases', () => {
    it('should handle very high request rates', async () => {
      const config = {
        maxTokens: 100,
        refillRate: 100 / 1000,
        windowMs: 1000,
      };

      const conv = 'high-rate-test';

      // Rapidly consume all tokens
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          rateLimiterService.isAllowed(mockUserId, conv, config).catch(() => null),
        );
      }
      await Promise.all(promises);

      // Should be rate limited
      await expect(
        rateLimiterService.isAllowed(mockUserId, conv, config),
      ).rejects.toThrow();
    });

    it('should handle single token per window', async () => {
      const config = {
        maxTokens: 1,
        refillRate: 1 / 60000,
        windowMs: 60000,
      };

      const conv = 'single-token-test';

      // First message OK
      await rateLimiterService.isAllowed(mockUserId, conv, config);

      // Subsequent messages should fail
      for (let i = 0; i < 5; i++) {
        await expect(
          rateLimiterService.isAllowed(mockUserId, conv, config),
        ).rejects.toThrow();
      }
    });
  });

  describe('environment-based configuration', () => {
    it('should respect MESSAGING_RATE_LIMIT_ENABLED flag', () => {
      const originalEnv = process.env.MESSAGING_RATE_LIMIT_ENABLED;
      process.env.MESSAGING_RATE_LIMIT_ENABLED = 'false';

      const disabledService = new MessageRateLimiterService();
      const config = {
        maxTokens: 1,
        refillRate: 1 / 1000,
        windowMs: 1000,
      };

      const conv = 'disabled-test';

      // Should allow unlimited with disabled flag
      (async () => {
        for (let i = 0; i < 1000; i++) {
          await disabledService.isAllowed(mockUserId, conv, config);
        }
      })();

      process.env.MESSAGING_RATE_LIMIT_ENABLED = originalEnv;
    });
  });
});
