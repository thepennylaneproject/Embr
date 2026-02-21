/**
 * Messaging Service
 * Handles all business logic for direct messaging
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MessageType as PrismaMessageType,
  MessageStatus as PrismaMessageStatus,
} from '@prisma/client';
import {
  SendMessageDto,
  MarkAsReadDto,
  GetConversationsDto,
  GetMessagesDto,
  SearchMessagesDto,
  CreateConversationDto,
  DeleteMessageDto,
  DeleteConversationDto,
} from '../dto/messaging.dto';
import {
  Message,
  Conversation,
  ConversationPreview,
  ConversationWithDetails,
  MessageWithSender,
  MessageType,
  MessageStatus,
  GetConversationsResponse,
  GetMessagesResponse,
  SearchMessagesResponse,
  SendMessageResponse,
  MarkAsReadResponse,
  CreateConversationResponse,
  GetUnreadCountResponse,
} from '../../../shared/types/messaging.types';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // CONVERSATION OPERATIONS
  // ============================================================

  async getConversations(
    userId: string,
    dto: GetConversationsDto,
  ): Promise<GetConversationsResponse> {
    const { page = 1, limit = 20, search } = dto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      OR: [{ participant1Id: userId }, { participant2Id: userId }],
    };

    // Add search filter if provided
    if (search) {
      where.OR = [
        {
          participant1Id: userId,
          participant2: {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { profile: { displayName: { contains: search, mode: 'insensitive' } } },
            ],
          },
        },
        {
          participant2Id: userId,
          participant1: {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { profile: { displayName: { contains: search, mode: 'insensitive' } } },
            ],
          },
        },
      ];
    }

    // Get total count
    const total = await this.prisma.conversation.count({ where });

    // Get conversations with related data
    const conversations = (await this.prisma.conversation.findMany({
      where,
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
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      skip,
    })) as any[];

    // Transform to conversation previews
    const conversationPreviews: ConversationPreview[] = await Promise.all(
      conversations.map(async (conv) => {
        const otherUser =
          conv.participant1Id === userId ? conv.participant2 : conv.participant1;

        // Get unread count
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            status: { not: MessageStatus.READ },
          },
        });

        return {
          id: conv.id,
          otherUser: {
            id: otherUser.id,
            username: otherUser.username,
            profile: otherUser.profile,
          },
          lastMessage: conv.messages[0]
            ? {
                id: conv.messages[0].id,
                conversationId: conv.messages[0].conversationId,
                senderId: conv.messages[0].senderId,
                content: conv.messages[0].content,
                mediaUrl: conv.messages[0].mediaUrl,
                mediaType: conv.messages[0].mediaType,
                fileName: conv.messages[0].fileName,
                fileSize: conv.messages[0].fileSize,
                type: conv.messages[0].type as any,
                status: conv.messages[0].status as any,
                createdAt: conv.messages[0].createdAt.toISOString(),
                readAt: conv.messages[0].readAt?.toISOString(),
                metadata: conv.messages[0].metadata,
                sender: {
                  id: conv.messages[0].sender.id,
                  username: conv.messages[0].sender.username,
                  profile: conv.messages[0].sender.profile,
                },
              }
            : null,
          unreadCount,
          lastMessageAt: conv.lastMessageAt.toISOString(),
        };
      }),
    );

    return {
      conversations: conversationPreviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + conversations.length < total,
    };
  }

  async getOrCreateConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<CreateConversationResponse> {
    const { participantId, initialMessage } = dto;

    // Check if user is trying to message themselves
    if (userId === participantId) {
      throw new BadRequestException('Cannot create conversation with yourself');
    }

    // Check if participant exists
    const participant = await this.prisma.user.findUnique({
      where: { id: participantId },
      include: {
        profile: true,
      },
    });

    if (!participant) {
      throw new NotFoundException('User not found');
    }

    // Check if conversation already exists
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: userId, participant2Id: participantId },
          { participant1Id: participantId, participant2Id: userId },
        ],
      },
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
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    let conversation: any;
    let message: MessageWithSender | undefined;

    if (existingConversation) {
      conversation = existingConversation;
    } else {
      // Create new conversation
      conversation = await this.prisma.conversation.create({
        data: {
          participant1Id: userId,
          participant2Id: participantId,
        },
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
    }

    // Send initial message if provided
    if (initialMessage) {
      const newMessage = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          content: initialMessage,
          type: PrismaMessageType.TEXT,
          status: PrismaMessageStatus.SENT,
        },
        include: {
          sender: {
            include: {
              profile: true,
            },
          },
        },
      });

      // Update conversation last message time
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      message = {
        id: newMessage.id,
        conversationId: newMessage.conversationId,
        senderId: newMessage.senderId,
        content: newMessage.content,
        mediaUrl: newMessage.mediaUrl,
        mediaType: newMessage.mediaType,
        fileName: newMessage.fileName,
        fileSize: newMessage.fileSize,
        type: newMessage.type as MessageType,
        status: newMessage.status as MessageStatus,
        createdAt: newMessage.createdAt.toISOString(),
        readAt: newMessage.readAt?.toISOString(),
        metadata: newMessage.metadata as Record<string, any>,
        sender: {
          id: newMessage.sender.id,
          username: newMessage.sender.username,
          profile: newMessage.sender.profile,
        },
      };
    }

    const conversationWithDetails: ConversationWithDetails = {
      id: conversation.id,
      participant1Id: conversation.participant1Id,
      participant2Id: conversation.participant2Id,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
      participant1: {
        id: conversation.participant1.id,
        username: conversation.participant1.username,
        profile: conversation.participant1.profile,
      },
      participant2: {
        id: conversation.participant2.id,
        username: conversation.participant2.username,
        profile: conversation.participant2.profile,
      },
      lastMessage: message || conversation.messages[0],
      unreadCount: 0,
    };

    return {
      conversation: conversationWithDetails,
      message,
    };
  }

  async deleteConversation(
    userId: string,
    dto: DeleteConversationDto,
  ): Promise<{ message: string }> {
    const { conversationId } = dto;

    // Check if user is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.participant1Id !== userId &&
      conversation.participant2Id !== userId
    ) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Soft delete: In production, you might want to keep messages for both users
    // and just hide for the deleting user
    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    return { message: 'Conversation deleted successfully' };
  }

  // ============================================================
  // MESSAGE OPERATIONS
  // ============================================================

  async sendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<SendMessageResponse> {
    const { conversationId, recipientId, content, mediaUrl, type, metadata } = dto;

    // Validate: must provide either conversationId or recipientId
    if (!conversationId && !recipientId) {
      throw new BadRequestException(
        'Must provide either conversationId or recipientId',
      );
    }

    // Validate: must provide content or mediaUrl
    if (!content && !mediaUrl) {
      throw new BadRequestException('Message must have content or media');
    }

    let conversation: any;

    if (conversationId) {
      // Get existing conversation
      conversation = await this.prisma.conversation.findUnique({
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

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Check if user is a participant
      if (
        conversation.participant1Id !== userId &&
        conversation.participant2Id !== userId
      ) {
        throw new ForbiddenException('You are not a participant in this conversation');
      }
    } else if (recipientId) {
      // Create or get conversation
      const createResult = await this.getOrCreateConversation(userId, {
        participantId: recipientId,
      });
      conversation = createResult.conversation;
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        content,
        mediaUrl,
        mediaType: dto.mediaType,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        type,
        status: PrismaMessageStatus.SENT,
        metadata: metadata as any,
      },
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Update conversation last message time
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    const messageWithSender: MessageWithSender = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      fileName: message.fileName,
      fileSize: message.fileSize,
      type: message.type as any,
      status: message.status as any,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString(),
      metadata: message.metadata as Record<string, any>,
      sender: {
        id: (message as any).sender.id,
        username: (message as any).sender.username,
        profile: (message as any).sender.profile as any,
      },
    };

    // Get unread count
    const unreadCount = await this.getUnreadCountForConversation(
      conversation.id,
      userId,
    );

    const conversationWithDetails: ConversationWithDetails = {
      id: conversation.id,
      participant1Id: conversation.participant1Id,
      participant2Id: conversation.participant2Id,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
      participant1: conversation.participant1,
      participant2: conversation.participant2,
      lastMessage: messageWithSender,
      unreadCount,
    };

    return {
      message: messageWithSender,
      conversation: conversationWithDetails,
    };
  }

  async getMessages(
    userId: string,
    dto: GetMessagesDto,
  ): Promise<GetMessagesResponse> {
    const { conversationId, page = 1, limit = 50, before, after } = dto;

    // Check if user is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.participant1Id !== userId &&
      conversation.participant2Id !== userId
    ) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Build where clause for pagination
    const where: any = { conversationId };

    if (before) {
      const beforeMessage = await this.prisma.message.findUnique({
        where: { id: before },
      });
      if (beforeMessage) {
        where.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    if (after) {
      const afterMessage = await this.prisma.message.findUnique({
        where: { id: after },
      });
      if (afterMessage) {
        where.createdAt = { gt: afterMessage.createdAt };
      }
    }

    // Get total count
    const total = await this.prisma.message.count({
      where: { conversationId },
    });

    // Get messages
    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Transform messages
    const transformedMessages: MessageWithSender[] = messages.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      type: msg.type as MessageType,
      status: msg.status as MessageStatus,
      createdAt: msg.createdAt.toISOString(),
      readAt: msg.readAt?.toISOString(),
      metadata: msg.metadata as Record<string, any>,
      sender: {
        id: msg.sender.id,
        username: msg.sender.username,
        profile: msg.sender.profile,
      },
    }));

    // Check if there are more messages
    const hasMoreBefore = before
      ? (await this.prisma.message.count({
          where: {
            conversationId,
            createdAt: { lt: messages[messages.length - 1]?.createdAt },
          },
        })) > 0
      : false;

    const hasMoreAfter = after
      ? (await this.prisma.message.count({
          where: {
            conversationId,
            createdAt: { gt: messages[0]?.createdAt },
          },
        })) > 0
      : false;

    return {
      messages: transformedMessages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: messages.length === limit,
      hasMoreBefore,
      hasMoreAfter,
    };
  }

  async markAsRead(
    userId: string,
    dto: MarkAsReadDto,
  ): Promise<MarkAsReadResponse> {
    const { conversationId, messageIds } = dto;

    // Check if user is a participant
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
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.participant1Id !== userId &&
      conversation.participant2Id !== userId
    ) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Build where clause
    const where: any = {
      conversationId,
      senderId: { not: userId },
      status: { not: MessageStatus.READ },
    };

    if (messageIds && messageIds.length > 0) {
      where.id = { in: messageIds };
    }

    // Update messages
    const result = await this.prisma.message.updateMany({
      where,
      data: {
        status: PrismaMessageStatus.READ,
        readAt: new Date(),
      },
    });

    // Get unread count
    const unreadCount = await this.getUnreadCountForConversation(
      conversationId,
      userId,
    );

    const conversationWithDetails: ConversationWithDetails = {
      id: conversation.id,
      participant1Id: conversation.participant1Id,
      participant2Id: conversation.participant2Id,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      createdAt: conversation.createdAt.toISOString(),
      participant1: conversation.participant1,
      participant2: conversation.participant2,
      lastMessage: conversation.messages[0]
        ? {
            id: conversation.messages[0].id,
            conversationId: conversation.messages[0].conversationId,
            senderId: conversation.messages[0].senderId,
            content: conversation.messages[0].content,
            mediaUrl: conversation.messages[0].mediaUrl,
            mediaType: conversation.messages[0].mediaType,
            fileName: conversation.messages[0].fileName,
            fileSize: conversation.messages[0].fileSize,
            type: conversation.messages[0].type as MessageType,
            status: conversation.messages[0].status as MessageStatus,
            createdAt: conversation.messages[0].createdAt.toISOString(),
            readAt: conversation.messages[0].readAt?.toISOString(),
            metadata: conversation.messages[0].metadata as Record<string, any>,
            sender: {
              id: conversation.messages[0].sender.id,
              username: conversation.messages[0].sender.username,
              profile: conversation.messages[0].sender.profile,
            },
          }
        : null,
      unreadCount,
    };

    return {
      updatedCount: result.count,
      conversation: conversationWithDetails,
    };
  }

  async searchMessages(
    userId: string,
    dto: SearchMessagesDto,
  ): Promise<SearchMessagesResponse> {
    const { conversationId, query, page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    // Check if user is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.participant1Id !== userId &&
      conversation.participant2Id !== userId
    ) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Search messages
    const where = {
      conversationId,
      content: {
        contains: query,
        mode: 'insensitive' as const,
      },
    };

    const total = await this.prisma.message.count({ where });

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    const transformedMessages: MessageWithSender[] = messages.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      fileName: msg.fileName,
      fileSize: msg.fileSize,
      type: msg.type as MessageType,
      status: msg.status as MessageStatus,
      createdAt: msg.createdAt.toISOString(),
      readAt: msg.readAt?.toISOString(),
      metadata: msg.metadata as Record<string, any>,
      sender: {
        id: msg.sender.id,
        username: msg.sender.username,
        profile: msg.sender.profile,
      },
    }));

    return {
      messages: transformedMessages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + messages.length < total,
    };
  }

  async deleteMessage(
    userId: string,
    dto: DeleteMessageDto,
  ): Promise<{ message: string }> {
    const { messageId, conversationId } = dto;

    // Get message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.conversationId !== conversationId) {
      throw new BadRequestException('Message does not belong to this conversation');
    }

    // Only sender can delete their own messages
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Soft delete
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: 'This message has been deleted',
        mediaUrl: null,
        metadata: { deleted: true, deletedAt: new Date().toISOString() } as any,
      },
    });

    return { message: 'Message deleted successfully' };
  }

  // ============================================================
  // UNREAD COUNT OPERATIONS
  // ============================================================

  async getUnreadCount(userId: string): Promise<GetUnreadCountResponse> {
    // Get all conversations for user
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      select: { id: true },
    });

    // Get unread counts for each conversation
    const conversationCounts = await Promise.all(
      conversations.map(async (conv) => ({
        conversationId: conv.id,
        unreadCount: await this.getUnreadCountForConversation(conv.id, userId),
      })),
    );

    const totalUnread = conversationCounts.reduce(
      (sum, conv) => sum + conv.unreadCount,
      0,
    );

    return {
      totalUnread,
      conversationCounts: conversationCounts.filter((c) => c.unreadCount > 0),
    };
  }

  private async getUnreadCountForConversation(
    conversationId: string,
    userId: string,
  ): Promise<number> {
    return await this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: MessageStatus.READ },
      },
    });
  }
}
