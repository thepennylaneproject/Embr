/**
 * Conversation Access Service
 * Validates user access to conversations and provides permission checks
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma.service';

interface ConversationAccess {
  isParticipant: boolean;
  conversation?: any;
}

@Injectable()
export class ConversationAccessService {
  private readonly logger = new Logger(ConversationAccessService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Validate if a user is a participant in a conversation
   * Returns the conversation if user is a participant, null otherwise
   */
  async validateConversationAccess(userId: string, conversationId: string): Promise<any> {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participant1: {
            include: {
              profile: true,
            },
          },
          participant2: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!conversation || conversation.deletedAt) {
        this.logger.debug(`Conversation ${conversationId} not found`);
        return null;
      }

      // Check if user is one of the participants
      const isParticipant =
        conversation.participant1Id === userId || conversation.participant2Id === userId;

      if (!isParticipant) {
        this.logger.warn(
          `User ${userId} attempted access to conversation ${conversationId} they don't participate in`,
        );
        return null;
      }

      return conversation;
    } catch (error) {
      this.logger.error(
        `Error validating conversation access for user ${userId} in conversation ${conversationId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Check if a user is a participant in a conversation
   */
  async isParticipant(userId: string, conversationId: string): Promise<boolean> {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation || conversation.deletedAt) {
        return false;
      }

      return conversation.participant1Id === userId || conversation.participant2Id === userId;
    } catch (error) {
      this.logger.error(
        `Error checking participant status for user ${userId} in conversation ${conversationId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get the other participant in a conversation
   */
  async getOtherParticipant(userId: string, conversationId: string): Promise<any> {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participant1: {
            include: {
              profile: true,
            },
          },
          participant2: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!conversation || conversation.deletedAt) {
        return null;
      }

      // Verify user is a participant
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return null;
      }

      // Return the other participant
      return conversation.participant1Id === userId ? conversation.participant2 : conversation.participant1;
    } catch (error) {
      this.logger.error(
        `Error getting other participant for user ${userId} in conversation ${conversationId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Validate message belongs to a conversation
   */
  async validateMessageInConversation(messageId: string, conversationId: string): Promise<boolean> {
    try {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        select: {
          conversationId: true,
        },
      });

      if (!message) {
        this.logger.debug(`Message ${messageId} not found`);
        return false;
      }

      const isInConversation = message.conversationId === conversationId;

      if (!isInConversation) {
        this.logger.warn(
          `Message ${messageId} does not belong to conversation ${conversationId}`,
        );
      }

      return isInConversation;
    } catch (error) {
      this.logger.error(
        `Error validating message ${messageId} in conversation ${conversationId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get access level for a user to a conversation
   * Returns info about user's relationship to the conversation
   */
  async getAccessLevel(userId: string, conversationId: string): Promise<ConversationAccess> {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
          participant1Id: true,
          participant2Id: true,
          deletedAt: true,
        },
      });

      if (!conversation || conversation.deletedAt) {
        return { isParticipant: false };
      }

      const isParticipant =
        conversation.participant1Id === userId || conversation.participant2Id === userId;

      return {
        isParticipant,
        conversation: isParticipant ? conversation : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Error getting access level for user ${userId} in conversation ${conversationId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Bulk validate conversations for a user
   * Returns map of conversationId -> isParticipant
   */
  async validateConversations(
    userId: string,
    conversationIds: string[],
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();

    try {
      const conversations = await this.prisma.conversation.findMany({
        where: {
          id: {
            in: conversationIds,
          },
          deletedAt: null,
        },
        select: {
          id: true,
          participant1Id: true,
          participant2Id: true,
        },
      });

      // Initialize all as false
      conversationIds.forEach((id) => result.set(id, false));

      // Check participation
      conversations.forEach((conv) => {
        const isParticipant = conv.participant1Id === userId || conv.participant2Id === userId;
        result.set(conv.id, isParticipant);
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Error bulk validating conversations for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }
}
