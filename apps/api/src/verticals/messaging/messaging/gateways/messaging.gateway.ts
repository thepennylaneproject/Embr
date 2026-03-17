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
import { Injectable, UseGuards, Logger, HttpException, HttpStatus, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessagingService } from '../services/messaging.service';
import { MessageRateLimiterService } from '../services/message-rate-limiter.service';
import { ConversationAccessService } from '../services/conversation-access.service';
import { RedisService } from '../../../../core/redis/redis.service';
import { RedisIoAdapter } from '../../../../core/redis/redis-io.adapter';
import { extractBearerToken } from '../../../../shared/auth-header.util';
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
} from '@embr/types';

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
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds (fallback for in-memory)
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map(); // conversationId-userId -> timeout
  private redisService?: RedisService;
  private useRedis = false;

  constructor(
    private messagingService: MessagingService,
    private jwtService: JwtService,
    private rateLimiter: MessageRateLimiterService,
    private conversationAccess: ConversationAccessService,
  ) {}

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  afterInit(server: Server) {
    this.logger.log('Messaging WebSocket Gateway initialized');
  }

  /**
   * Set Redis adapter and service for distributed deployments
   */
  setRedisAdapter(adapter: RedisIoAdapter, redisService?: RedisService) {
    if (this.server) {
      this.server.adapter(adapter.createIOServer(0).adapter());
    }
    if (redisService) {
      this.redisService = redisService;
      this.useRedis = true;
      this.logger.log('Redis adapter enabled for multi-instance messaging');
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake — check auth payload first, then fall back to
      // the Authorization header (handles both lowercase and PascalCase variants).
      const token =
        client.handshake.auth.token ||
        extractBearerToken(client.handshake.headers as Record<string, string | string[] | undefined>);

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

      // Track user socket (use Redis if available, fallback to in-memory)
      if (this.useRedis && this.redisService) {
        try {
          await this.redisService.addSocket(client.userId, client.id);
        } catch (error) {
          this.logger.warn(`Failed to add socket to Redis, using in-memory: ${error.message}`);
          this.trackSocketInMemory(client.userId, client.id);
        }
      } else {
        this.trackSocketInMemory(client.userId, client.id);
      }

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

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      // Remove from Redis if available, fallback to in-memory
      if (this.useRedis && this.redisService) {
        try {
          await this.redisService.removeSocket(client.userId, client.id);
        } catch (error) {
          this.logger.warn(`Failed to remove socket from Redis, using in-memory: ${error.message}`);
          this.removeSocketFromMemory(client.userId, client.id);
        }
      } else {
        this.removeSocketFromMemory(client.userId, client.id);
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
      if (await this.isUserOnline(recipientId)) {
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

      // Handle rate limiting error
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        client.emit(WebSocketEvent.ERROR, {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message || 'Too many messages sent. Please wait before sending more.',
        });
        return;
      }

      // Handle block enforcement error
      if (error instanceof ForbiddenException) {
        client.emit(WebSocketEvent.ERROR, {
          code: 'BLOCKED_USER',
          message: error.message || 'Cannot send message. One user may have blocked the other.',
        });
        return;
      }

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
      if (!client.userId) {
        client.emit(WebSocketEvent.ERROR, {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        });
        return;
      }

      // Validate user is a participant in the conversation
      const conversation = await this.conversationAccess.validateConversationAccess(
        client.userId,
        data.conversationId,
      );

      if (!conversation) {
        client.emit(WebSocketEvent.ERROR, {
          code: 'UNAUTHORIZED',
          message: 'Not a participant in this conversation',
        });
        return;
      }

      // Validate message exists and belongs to the conversation
      const isValidMessage = await this.conversationAccess.validateMessageInConversation(
        data.messageId,
        data.conversationId,
      );

      if (!isValidMessage) {
        client.emit(WebSocketEvent.ERROR, {
          code: 'NOT_FOUND',
          message: 'Message not found in this conversation',
        });
        return;
      }

      // Notify sender that message was delivered
      const recipientId =
        conversation.participant1Id === client.userId
          ? conversation.participant2Id
          : conversation.participant1Id;

      this.server.to(`user:${recipientId}`).emit(WebSocketEvent.MESSAGE_DELIVERED, {
        messageId: data.messageId,
        conversationId: data.conversationId,
      });
    } catch (error) {
      this.logger.error('Error marking message as delivered:', error);
      client.emit(WebSocketEvent.ERROR, {
        code: 'DELIVERY_FAILED',
        message: 'Failed to mark message as delivered',
      });
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

      // Mark all messages in multiple conversations as read using a single bulk
      // operation (3 fixed DB queries) instead of N * markAsRead() calls.
      const bulkResult = await this.messagingService.bulkMarkAsRead(
        client.userId!,
        data.conversationIds,
      );

      // Emit to reader
      this.server.to(`user:${client.userId}`).emit(WebSocketEvent.MESSAGE_BULK_READ, {
        conversationIds: bulkResult.conversationIds,
        updatedCount: bulkResult.updatedCount,
        unreadCounts: bulkResult.unreadCounts,
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

      // Validate user is a participant in the conversation
      const conversation = await this.conversationAccess.validateConversationAccess(
        client.userId,
        conversationId,
      );

      if (!conversation) {
        client.emit(WebSocketEvent.ERROR, {
          code: 'UNAUTHORIZED',
          message: 'Not a participant in this conversation',
        });
        return;
      }

      // Get the other participant
      const recipientId =
        conversation.participant1Id === client.userId
          ? conversation.participant2Id
          : conversation.participant1Id;

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

      // Validate user is a participant in the conversation
      const conversation = await this.conversationAccess.validateConversationAccess(
        client.userId,
        conversationId,
      );

      if (!conversation) {
        client.emit(WebSocketEvent.ERROR, {
          code: 'UNAUTHORIZED',
          message: 'Not a participant in this conversation',
        });
        return;
      }

      const recipientId =
        conversation.participant1Id === client.userId
          ? conversation.participant2Id
          : conversation.participant1Id;

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

  private async isUserOnline(userId: string): Promise<boolean> {
    if (this.useRedis && this.redisService) {
      try {
        return await this.redisService.isOnline(userId);
      } catch (error) {
        this.logger.warn(`Failed to check online status from Redis: ${error.message}`);
        return this.isUserOnlineInMemory(userId);
      }
    }
    return this.isUserOnlineInMemory(userId);
  }

  private isUserOnlineInMemory(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  private trackSocketInMemory(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private removeSocketFromMemory(userId: string, socketId: string): void {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
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
