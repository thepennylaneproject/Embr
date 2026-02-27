/**
 * WebSocket Validation Tests
 * Tests conversation access validation for WebSocket events
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConversationAccessService } from '../services/conversation-access.service';
import { PrismaService } from '../../../../core/database/prisma.service';

describe('ConversationAccessService', () => {
  let service: ConversationAccessService;
  let prismaService: PrismaService;

  const mockUserId1 = 'user-1';
  const mockUserId2 = 'user-2';
  const mockUserId3 = 'user-3';
  const mockConversationId = 'conv-123';
  const mockMessageId = 'msg-456';

  const mockConversation = {
    id: mockConversationId,
    participant1Id: mockUserId1,
    participant2Id: mockUserId2,
    participant1: {
      id: mockUserId1,
      username: 'user1',
      profile: {},
    },
    participant2: {
      id: mockUserId2,
      username: 'user2',
      profile: {},
    },
    createdAt: new Date(),
    lastMessageAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationAccessService,
        {
          provide: PrismaService,
          useValue: {
            conversation: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            message: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ConversationAccessService>(ConversationAccessService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateConversationAccess', () => {
    it('should allow access for participant1', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.validateConversationAccess(mockUserId1, mockConversationId);

      expect(result).toEqual(mockConversation);
    });

    it('should allow access for participant2', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.validateConversationAccess(mockUserId2, mockConversationId);

      expect(result).toEqual(mockConversation);
    });

    it('should deny access for non-participant', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.validateConversationAccess(mockUserId3, mockConversationId);

      expect(result).toBeNull();
    });

    it('should return null for non-existent conversation', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateConversationAccess(mockUserId1, 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('isParticipant', () => {
    it('should return true for participant1', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue({
        participant1Id: mockUserId1,
        participant2Id: mockUserId2,
      });

      const result = await service.isParticipant(mockUserId1, mockConversationId);

      expect(result).toBe(true);
    });

    it('should return true for participant2', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue({
        participant1Id: mockUserId1,
        participant2Id: mockUserId2,
      });

      const result = await service.isParticipant(mockUserId2, mockConversationId);

      expect(result).toBe(true);
    });

    it('should return false for non-participant', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue({
        participant1Id: mockUserId1,
        participant2Id: mockUserId2,
      });

      const result = await service.isParticipant(mockUserId3, mockConversationId);

      expect(result).toBe(false);
    });

    it('should return false for non-existent conversation', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.isParticipant(mockUserId1, 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getOtherParticipant', () => {
    it('should return participant2 when querying as participant1', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.getOtherParticipant(mockUserId1, mockConversationId);

      expect(result).toEqual(mockConversation.participant2);
    });

    it('should return participant1 when querying as participant2', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.getOtherParticipant(mockUserId2, mockConversationId);

      expect(result).toEqual(mockConversation.participant1);
    });

    it('should return null for non-participant', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.getOtherParticipant(mockUserId3, mockConversationId);

      expect(result).toBeNull();
    });

    it('should return null for non-existent conversation', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getOtherParticipant(mockUserId1, 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('validateMessageInConversation', () => {
    it('should return true when message belongs to conversation', async () => {
      (prismaService.message.findUnique as jest.Mock).mockResolvedValue({
        id: mockMessageId,
        conversationId: mockConversationId,
      });

      const result = await service.validateMessageInConversation(mockMessageId, mockConversationId);

      expect(result).toBe(true);
    });

    it('should return false when message does not belong to conversation', async () => {
      (prismaService.message.findUnique as jest.Mock).mockResolvedValue({
        id: mockMessageId,
        conversationId: 'different-conv',
      });

      const result = await service.validateMessageInConversation(mockMessageId, mockConversationId);

      expect(result).toBe(false);
    });

    it('should return false for non-existent message', async () => {
      (prismaService.message.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateMessageInConversation('non-existent', mockConversationId);

      expect(result).toBe(false);
    });
  });

  describe('getAccessLevel', () => {
    it('should return participant true with conversation for participant1', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.getAccessLevel(mockUserId1, mockConversationId);

      expect(result.isParticipant).toBe(true);
      expect(result.conversation).toEqual(mockConversation);
    });

    it('should return participant true with conversation for participant2', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.getAccessLevel(mockUserId2, mockConversationId);

      expect(result.isParticipant).toBe(true);
      expect(result.conversation).toEqual(mockConversation);
    });

    it('should return participant false without conversation for non-participant', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      const result = await service.getAccessLevel(mockUserId3, mockConversationId);

      expect(result.isParticipant).toBe(false);
      expect(result.conversation).toBeUndefined();
    });

    it('should return participant false for non-existent conversation', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getAccessLevel(mockUserId1, 'non-existent');

      expect(result.isParticipant).toBe(false);
      expect(result.conversation).toBeUndefined();
    });
  });

  describe('validateConversations', () => {
    it('should validate multiple conversations', async () => {
      const conv1 = { id: 'conv-1', participant1Id: mockUserId1, participant2Id: mockUserId2 };
      const conv2 = { id: 'conv-2', participant1Id: mockUserId2, participant2Id: mockUserId3 };
      const conv3 = { id: 'conv-3', participant1Id: mockUserId3, participant2Id: 'user-4' };

      (prismaService.conversation.findMany as jest.Mock).mockResolvedValue([conv1, conv2, conv3]);

      const result = await service.validateConversations(mockUserId1, [
        'conv-1',
        'conv-2',
        'conv-3',
      ]);

      expect(result.get('conv-1')).toBe(true); // participant1
      expect(result.get('conv-2')).toBe(false); // non-participant
      expect(result.get('conv-3')).toBe(false); // non-participant
    });

    it('should handle empty conversation list', async () => {
      (prismaService.conversation.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.validateConversations(mockUserId1, ['conv-1', 'conv-2']);

      expect(result.get('conv-1')).toBe(false);
      expect(result.get('conv-2')).toBe(false);
    });

    it('should handle partial results', async () => {
      const conv1 = { id: 'conv-1', participant1Id: mockUserId1, participant2Id: mockUserId2 };

      (prismaService.conversation.findMany as jest.Mock).mockResolvedValue([conv1]);

      const result = await service.validateConversations(mockUserId1, [
        'conv-1',
        'conv-2',
        'conv-3',
      ]);

      expect(result.get('conv-1')).toBe(true);
      expect(result.get('conv-2')).toBe(false);
      expect(result.get('conv-3')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      (prismaService.conversation.findUnique as jest.Mock).mockRejectedValue(error);

      await expect(
        service.validateConversationAccess(mockUserId1, mockConversationId),
      ).rejects.toThrow('Database error');
    });

    it('should handle message validation errors', async () => {
      const error = new Error('Message query failed');
      (prismaService.message.findUnique as jest.Mock).mockRejectedValue(error);

      await expect(
        service.validateMessageInConversation(mockMessageId, mockConversationId),
      ).rejects.toThrow('Message query failed');
    });

    it('should handle bulk validation errors', async () => {
      const error = new Error('Bulk query failed');
      (prismaService.conversation.findMany as jest.Mock).mockRejectedValue(error);

      await expect(
        service.validateConversations(mockUserId1, ['conv-1']),
      ).rejects.toThrow('Bulk query failed');
    });
  });

  describe('security scenarios', () => {
    it('should prevent typing indicator from being sent to unauthorized conversation', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      // User 3 tries to get typing access
      const result = await service.validateConversationAccess(mockUserId3, mockConversationId);

      // Should be denied
      expect(result).toBeNull();
    });

    it('should prevent delivery confirmation for unauthorized message', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prismaService.message.findUnique as jest.Mock).mockResolvedValue({
        id: mockMessageId,
        conversationId: mockConversationId,
      });

      // User 3 tries to confirm delivery
      const isValid = await service.validateMessageInConversation(mockMessageId, mockConversationId);

      // First check: message is valid
      expect(isValid).toBe(true);

      // Second check: conversation access
      const hasAccess = await service.validateConversationAccess(mockUserId3, mockConversationId);
      expect(hasAccess).toBeNull();
    });

    it('should prevent reading receipts from being manipulated', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      // User 3 tries to send read receipt
      const result = await service.validateConversationAccess(mockUserId3, mockConversationId);

      // Should be denied
      expect(result).toBeNull();
    });

    it('should allow legitimate typing indicators', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      // User 1 sends typing indicator
      const result = await service.validateConversationAccess(mockUserId1, mockConversationId);

      // Should be allowed
      expect(result).toEqual(mockConversation);
    });

    it('should allow legitimate delivery confirmations', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);
      (prismaService.message.findUnique as jest.Mock).mockResolvedValue({
        id: mockMessageId,
        conversationId: mockConversationId,
      });

      // User 2 confirms delivery
      const hasAccess = await service.validateConversationAccess(mockUserId2, mockConversationId);
      const isValid = await service.validateMessageInConversation(mockMessageId, mockConversationId);

      expect(hasAccess).toEqual(mockConversation);
      expect(isValid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateConversationAccess('', '');

      expect(result).toBeNull();
    });

    it('should handle very long conversation ID', async () => {
      const longId = 'x'.repeat(1000);
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateConversationAccess(mockUserId1, longId);

      expect(result).toBeNull();
    });

    it('should handle special characters in IDs', async () => {
      const specialId = 'conv-123!@#$%^&*()';
      (prismaService.conversation.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateConversationAccess(mockUserId1, specialId);

      expect(result).toBeNull();
    });
  });
});
