/**
 * Messaging WebSocket Gateway
 * Handles real-time message delivery, typing indicators, and read receipts
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagingService } from '../services/messaging.service';
import {
  SendMessageDto,
  MarkAsReadDto,
  TypingIndicatorDto,
} from '../dto/messaging.dto';
import {
  WebSocketEvent,
  MessageWithSender,
  TypingIndicator,
  ConversationWithDetails,
} from '../../../shared/types/messaging.types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3004'],
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map(); // conversationId-userId -> timeout

  constructor(
    private messagingService: MessagingService,
    private jwtService: JwtService,
  ) {}

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  afterInit(server: Server) {
    this.logger.log('Messaging WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Attach user info to socket
      client.userId = payload.sub;
      client.username = payload.username;

      // Track user socket
      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId)!.add(client.id);

      // Join user's personal room for direct messaging
      client.join(`user:${client.userId}`);

      this.logger.log(
        `Client ${client.id} connected: ${client.username} (${client.userId})`,
      );

      // Notify user of successful connection
      client.emit(WebSocketEvent.CONNECT, {
        userId: client.userId,
        username: client.username,
      });
    } catch (error) {
      this.logger.error(`Client ${client.id} connection error:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.userSockets.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }

      this.logger.log(
        `Client ${client.id} disconnected: ${client.username} (${client.userId})`,
      );
    }
  }

  // ============================================================
  // MESSAGE EVENTS
  // ============================================================

  @SubscribeMessage(WebSocketEvent.MESSAGE_SEND)
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SendMessageDto,
  ) {
    try {
      if (!client.userId) {
        client.emit(WebSocketEvent.ERROR, {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
        return;
      }

      // Send message via service
      const result = await this.messagingService.sendMessage(client.userId, dto);

      // Emit to sender (all their connected devices)
      this.server
        .to(`user:${client.userId}`)
        .emit(WebSocketEvent.MESSAGE_SEND, result);

      // Determine recipient
      const recipientId =
        result.conversation.participant1Id === client.userId
          ? result.conversation.participant2Id
          : result.conversation.participant1Id;

      // Emit to recipient (all their connected devices)
      this.server
        .to(`user:${recipientId}`)
        .emit(WebSocketEvent.MESSAGE_RECEIVE, result);

      // Auto-mark as delivered if recipient is online
      if (this.isUserOnline(recipientId)) {
        await this.handleMessageDelivered(client, {
          messageId: result.message.id,
          conversationId: result.conversation.id,
        });
      }

      this.logger.log(
        `Message sent: ${result.message.id} from ${client.userId} to ${recipientId}`,
      );
    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit(WebSocketEvent.ERROR, {
        code: 'MESSAGE_SEND_FAILED',
        message: error.message || 'Failed to send message',
      });
    }
  }

  @SubscribeMessage(WebSocketEvent.MESSAGE_DELIVERED)
  async handleMessageDelivered(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    try {
      // Update message status to delivered
      // This would be implemented in your MessagingService
      // For now, just emit the event

      // Notify sender that message was delivered
      const conversation = await this.messagingService.getConversations(
        client.userId,
        { conversationId: data.conversationId } as any,
      );

      if (conversation.conversations.length > 0) {
        const conv = conversation.conversations[0];
        const senderId =
          conv.otherUser.id === client.userId
            ? conv.otherUser.id
            : client.userId;

        this.server.to(`user:${senderId}`).emit(WebSocketEvent.MESSAGE_DELIVERED, {
          messageId: data.messageId,
          conversationId: data.conversationId,
        });
      }
    } catch (error) {
      this.logger.error('Error marking message as delivered:', error);
    }
  }

  @SubscribeMessage(WebSocketEvent.MESSAGE_READ)
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: MarkAsReadDto,
  ) {
    try {
      if (!client.userId) {
        client.emit(WebSocketEvent.ERROR, {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
        return;
      }

      // Mark messages as read
      const result = await this.messagingService.markAsRead(client.userId, dto);

      // Emit to reader (all their devices)
      this.server
        .to(`user:${client.userId}`)
        .emit(WebSocketEvent.MESSAGE_READ, result);

      // Determine sender to notify
      const senderId =
        result.conversation.participant1Id === client.userId
          ? result.conversation.participant2Id
          : result.conversation.participant1Id;

      // Notify sender that messages were read
      this.server.to(`user:${senderId}`).emit(WebSocketEvent.MESSAGE_READ, {
        conversationId: dto.conversationId,
        messageIds: dto.messageIds,
        readBy: client.userId,
        readAt: new Date().toISOString(),
      });

      this.logger.log(
        `Messages marked as read in conversation ${dto.conversationId} by ${client.userId}`,
      );
    } catch (error) {
      this.logger.error('Error marking messages as read:', error);
      client.emit(WebSocketEvent.ERROR, {
        code: 'MARK_READ_FAILED',
        message: error.message || 'Failed to mark messages as read',
      });
    }
  }

  @SubscribeMessage(WebSocketEvent.MESSAGE_BULK_READ)
  async handleBulkMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationIds: string[] },
  ) {
    try {
      if (!client.userId) {
        client.emit(WebSocketEvent.ERROR, {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
        return;
      }

      // Mark all messages in multiple conversations as read
      const results = await Promise.all(
        data.conversationIds.map((conversationId) =>
          this.messagingService.markAsRead(client.userId!, { conversationId }),
        ),
      );

      // Emit to reader
      this.server.to(`user:${client.userId}`).emit(WebSocketEvent.MESSAGE_BULK_READ, {
        conversationIds: data.conversationIds,
        results,
      });

      this.logger.log(
        `Bulk read: ${data.conversationIds.length} conversations by ${client.userId}`,
      );
    } catch (error) {
      this.logger.error('Error in bulk mark as read:', error);
      client.emit(WebSocketEvent.ERROR, {
        code: 'BULK_READ_FAILED',
        message: error.message || 'Failed to mark messages as read',
      });
    }
  }

  // ============================================================
  // TYPING INDICATOR EVENTS
  // ============================================================

  @SubscribeMessage(WebSocketEvent.TYPING_START)
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: TypingIndicatorDto,
  ) {
    try {
      if (!client.userId) return;

      const { conversationId } = dto;

      // Get conversation to find other participant
      const conversations = await this.messagingService.getConversations(
        client.userId,
        {},
      );

      const conversation = conversations.conversations.find(
        (c) => c.id === conversationId,
      );

      if (!conversation) return;

      const recipientId = conversation.otherUser.id;

      // Clear existing timeout for this user in this conversation
      const timeoutKey = `${conversationId}-${client.userId}`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Emit typing indicator to recipient
      const typingIndicator: TypingIndicator = {
        conversationId,
        userId: client.userId,
        isTyping: true,
        timestamp: new Date().toISOString(),
      };

      this.server
        .to(`user:${recipientId}`)
        .emit(WebSocketEvent.TYPING_INDICATOR, typingIndicator);

      // Set timeout to auto-stop typing after 3 seconds
      const timeout = setTimeout(() => {
        this.handleTypingStop(client, { conversationId, isTyping: false });
        this.typingTimeouts.delete(timeoutKey);
      }, 3004);

      this.typingTimeouts.set(timeoutKey, timeout);
    } catch (error) {
      this.logger.error('Error handling typing start:', error);
    }
  }

  @SubscribeMessage(WebSocketEvent.TYPING_STOP)
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: TypingIndicatorDto,
  ) {
    try {
      if (!client.userId) return;

      const { conversationId } = dto;

      // Clear timeout
      const timeoutKey = `${conversationId}-${client.userId}`;
      const existingTimeout = this.typingTimeouts.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.typingTimeouts.delete(timeoutKey);
      }

      // Get conversation to find other participant
      const conversations = await this.messagingService.getConversations(
        client.userId,
        {},
      );

      const conversation = conversations.conversations.find(
        (c) => c.id === conversationId,
      );

      if (!conversation) return;

      const recipientId = conversation.otherUser.id;

      // Emit stop typing indicator to recipient
      const typingIndicator: TypingIndicator = {
        conversationId,
        userId: client.userId,
        isTyping: false,
        timestamp: new Date().toISOString(),
      };

      this.server
        .to(`user:${recipientId}`)
        .emit(WebSocketEvent.TYPING_INDICATOR, typingIndicator);
    } catch (error) {
      this.logger.error('Error handling typing stop:', error);
    }
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Send a message to a specific user (all their connected devices)
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Get all online user IDs
   */
  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Get number of connections for a user
   */
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }
}
