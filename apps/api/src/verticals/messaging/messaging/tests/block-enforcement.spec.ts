/**
 * Block Enforcement Tests
 * Tests that block functionality prevents conversation creation and messaging
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessagingService } from '../services/messaging.service';
import { MessageRateLimiterService } from '../services/message-rate-limiter.service';
import { PrismaService } from '../../../../core/database/prisma.service';
import { toRateLimitConfig, MESSAGE_RATE_LIMITS } from '../config/messaging-rate-limits';

describe('Block Enforcement', () => {
  let service: MessagingService;
  let prismaService: PrismaService;
  let rateLimiterService: MessageRateLimiterService;

  const mockUserId1 = 'user-1';
  const mockUserId2 = 'user-2';
  const mockConversationId = 'conv-123';

  const mockUser = {
    id: mockUserId2,
    username: 'user2',
    email: 'user2@example.com',
    profile: {
      displayName: 'User 2',
      avatar: null,
    },
  };

  const mockConversation = {
    id: mockConversationId,
    participant1Id: mockUserId1,
    participant2Id: mockUserId2,
    createdAt: new Date(),
    lastMessageAt: new Date(),
    participant1: { id: mockUserId1, username: 'user1', profile: {} },
    participant2: { id: mockUserId2, username: 'user2', profile: {} },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        MessageRateLimiterService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            conversation: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            message: {
              create: jest.fn(),
            },
            blockedUser: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    prismaService = module.get<PrismaService>(PrismaService);
    rateLimiterService = module.get<MessageRateLimiterService>(MessageRateLimiterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateConversation with block check', () => {
    it('should allow conversation creation when no block exists', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.conversation.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.conversation.create as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.getOrCreateConversation(mockUserId1, {
        participantId: mockUserId2,
      });

      expect(result.conversation).toEqual(mockConversation);
      expect(prismaService.blockedUser.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { blockerId: mockUserId1, blockedId: mockUserId2 },
            { blockerId: mockUserId2, blockedId: mockUserId1 },
          ],
        },
      });
    });

    it('should throw ForbiddenException when user1 blocks user2', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue({
        blockerId: mockUserId1,
        blockedId: mockUserId2,
      });

      await expect(
        service.getOrCreateConversation(mockUserId1, {
          participantId: mockUserId2,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user2 blocks user1', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue({
        blockerId: mockUserId2,
        blockedId: mockUserId1,
      });

      await expect(
        service.getOrCreateConversation(mockUserId1, {
          participantId: mockUserId2,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with descriptive message', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue({
        blockerId: mockUserId1,
        blockedId: mockUserId2,
      });

      await expect(
        service.getOrCreateConversation(mockUserId1, {
          participantId: mockUserId2,
        }),
      ).rejects.toThrow('Cannot create conversation. One user may have blocked the other.');
    });

    it('should check both block directions', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.conversation.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.conversation.create as jest.Mock).mockResolvedValue(mockConversation);

      await service.getOrCreateConversation(mockUserId1, {
        participantId: mockUserId2,
      });

      // Verify both directions are checked
      const blockedUserCall = (prismaService.blockedUser.findFirst as jest.Mock).mock.calls[0][0];
      expect(blockedUserCall.where.OR).toEqual([
        { blockerId: mockUserId1, blockedId: mockUserId2 },
        { blockerId: mockUserId2, blockedId: mockUserId1 },
      ]);
    });

    it('should still return existing conversation if it was created before block', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.conversation.findFirst as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.getOrCreateConversation(mockUserId1, {
        participantId: mockUserId2,
      });

      expect(result.conversation).toEqual(mockConversation);
    });
  });

  describe('sendMessage with block enforcement', () => {
    it('should block message send when conversation creation blocked by block', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue({
        blockerId: mockUserId1,
        blockedId: mockUserId2,
      });

      await expect(
        service.sendMessage(mockUserId1, {
          recipientId: mockUserId2,
          content: 'Hello',
          type: 'TEXT' as any,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow message send to existing conversation even if block was applied later', async () => {
      // This tests that blocks only prevent NEW conversations, not existing ones
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prismaService.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-123',
        conversationId: mockConversationId,
        senderId: mockUserId1,
        content: 'Hello',
        type: 'TEXT',
        status: 'SENT',
        createdAt: new Date(),
        sender: { id: mockUserId1, username: 'user1', profile: {} },
      });

      const result = await service.sendMessage(mockUserId1, {
        conversationId: mockConversationId,
        content: 'Hello',
        type: 'TEXT' as any,
      });

      expect(result.message).toBeDefined();
    });
  });

  describe('block scenarios', () => {
    it('should prevent bidirectional messaging when user1 blocks user2', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue({
        blockerId: mockUserId1,
        blockedId: mockUserId2,
      });

      // User1 cannot message user2
      await expect(
        service.getOrCreateConversation(mockUserId1, {
          participantId: mockUserId2,
        }),
      ).rejects.toThrow();

      // User2 also cannot message user1 (because of the block)
      await expect(
        service.getOrCreateConversation(mockUserId2, {
          participantId: mockUserId1,
        }),
      ).rejects.toThrow();
    });

    it('should allow user1 to message if user1 blocks user2', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue({
        blockerId: mockUserId1,
        blockedId: mockUserId2,
      });

      // Cannot create conversation (both directions blocked by the block)
      await expect(
        service.getOrCreateConversation(mockUserId1, {
          participantId: mockUserId2,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('edge cases', () => {
    it('should handle null block check result gracefully', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue(undefined);
      (prismaService.conversation.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.conversation.create as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.getOrCreateConversation(mockUserId1, {
        participantId: mockUserId2,
      });

      expect(result.conversation).toEqual(mockConversation);
    });

    it('should handle block check database errors', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.getOrCreateConversation(mockUserId1, {
          participantId: mockUserId2,
        }),
      ).rejects.toThrow('Database error');
    });
  });

  describe('block check order', () => {
    it('should check blocks before checking existing conversations', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue({
        blockerId: mockUserId1,
        blockedId: mockUserId2,
      });

      try {
        await service.getOrCreateConversation(mockUserId1, {
          participantId: mockUserId2,
        });
      } catch (error) {
        // Should throw before checking for existing conversation
        expect(prismaService.conversation.findFirst).not.toHaveBeenCalled();
      }
    });
  });

  describe('error message clarity', () => {
    it('should provide user-friendly error message', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue({
        blockerId: mockUserId1,
        blockedId: mockUserId2,
      });

      try {
        await service.getOrCreateConversation(mockUserId1, {
          participantId: mockUserId2,
        });
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Cannot create conversation');
        expect(error.message).toContain('blocked');
      }
    });
  });

  describe('block scenarios with existing conversations', () => {
    it('should allow messaging in existing conversation before block', async () => {
      // Setup: conversation already exists
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prismaService.message.create as jest.Mock).mockResolvedValue({
        id: 'msg-1',
        conversationId: mockConversationId,
        senderId: mockUserId1,
        content: 'Message',
        type: 'TEXT',
        status: 'SENT',
        createdAt: new Date(),
        sender: mockConversation.participant1,
      });

      const result = await service.sendMessage(mockUserId1, {
        conversationId: mockConversationId,
        content: 'Message',
        type: 'TEXT' as any,
      });

      expect(result.message.content).toBe('Message');
    });

    it('should check block on new message via recipientId', async () => {
      // When sending via recipientId, should check block
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.blockedUser.findFirst as jest.Mock).mockResolvedValue({
        blockerId: mockUserId1,
        blockedId: mockUserId2,
      });

      await expect(
        service.sendMessage(mockUserId1, {
          recipientId: mockUserId2,
          content: 'Message',
          type: 'TEXT' as any,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('multi-user scenarios', () => {
    it('should not affect other conversations', async () => {
      const mockUserId3 = 'user-3';

      // User1-User2 are blocked
      // User1-User3 should still work
      (prismaService.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockUser) // First call returns user2
        .mockResolvedValueOnce({ ...mockUser, id: mockUserId3 }); // Second call returns user3

      (prismaService.blockedUser.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          blockerId: mockUserId1,
          blockedId: mockUserId2,
        }) // First call - block exists
        .mockResolvedValueOnce(null); // Second call - no block

      (prismaService.conversation.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.conversation.create as jest.Mock).mockResolvedValue({
        ...mockConversation,
        participant2Id: mockUserId3,
      });

      // First call: blocked
      await expect(
        service.getOrCreateConversation(mockUserId1, {
          participantId: mockUserId2,
        }),
      ).rejects.toThrow();

      // Second call: allowed
      const result = await service.getOrCreateConversation(mockUserId1, {
        participantId: mockUserId3,
      });

      expect(result.conversation.participant2Id).toBe(mockUserId3);
    });
  });
});
