/**
 * Notifications WebSocket Gateway
 * Handles real-time notification delivery to clients
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
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3004'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(
    private notificationsService: NotificationsService,
    private jwtService: JwtService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  afterInit(server: Server) {
    this.logger.log('Notifications WebSocket Gateway initialized');

    // Listen to notification creation events and push to clients
    this.eventEmitter.on('notification.created', (data) => {
      this.broadcastNotification(data);
    });
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

      // Verify JWT and extract userId
      try {
        const decoded = this.jwtService.verify(token);
        client.userId = decoded.sub || decoded.id;

        // Track user socket connections
        if (!this.userSockets.has(client.userId)) {
          this.userSockets.set(client.userId, new Set());
        }
        this.userSockets.get(client.userId).add(client.id);

        // Join user-specific room for targeted broadcasts
        client.join(`user:${client.userId}`);

        this.logger.log(`User ${client.userId} connected (socket: ${client.id})`);
      } catch (error) {
        this.logger.warn(`Client ${client.id} connection rejected: Invalid token`);
        client.disconnect();
      }
    } catch (error) {
      this.logger.error(`Connection handler error: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const socketSet = this.userSockets.get(client.userId);
      if (socketSet) {
        socketSet.delete(client.id);
        if (socketSet.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
      this.logger.log(`User ${client.userId} disconnected (socket: ${client.id})`);
    }
  }

  // ============================================================
  // MESSAGE HANDLERS
  // ============================================================

  /**
   * Client subscribes to notifications
   */
  @SubscribeMessage('notifications:subscribe')
  async handleSubscribe(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    // Load unread notifications for the user
    try {
      const notifications = await this.notificationsService.findAll(client.userId, {
        page: 1,
        limit: 20,
        unreadOnly: true,
      });

      client.emit('notifications:initial', {
        notifications: notifications.data,
        unreadCount: notifications.meta.unreadCount,
      });

      this.logger.log(`User ${client.userId} subscribed to notifications`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Subscribe error for user ${client.userId}: ${error.message}`,
        error.stack,
      );
      return { error: 'Failed to subscribe' };
    }
  }

  /**
   * Client marks a notification as read
   */
  @SubscribeMessage('notifications:mark-read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const result = await this.notificationsService.markAsRead(
        data.notificationId,
        client.userId,
      );

      // Broadcast updated unread count to all user sockets
      const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
      this.server.to(`user:${client.userId}`).emit('notifications:unread-count', {
        unreadCount,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Mark as read error for user ${client.userId}: ${error.message}`,
        error.stack,
      );
      return { error: 'Failed to mark as read' };
    }
  }

  /**
   * Client marks all notifications as read
   */
  @SubscribeMessage('notifications:mark-all-read')
  async handleMarkAllAsRead(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      await this.notificationsService.markAllAsRead(client.userId);

      // Broadcast updated unread count
      this.server.to(`user:${client.userId}`).emit('notifications:unread-count', {
        unreadCount: 0,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Mark all as read error for user ${client.userId}: ${error.message}`,
        error.stack,
      );
      return { error: 'Failed to mark all as read' };
    }
  }

  /**
   * Client deletes a notification
   */
  @SubscribeMessage('notifications:delete')
  async handleDeleteNotification(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    try {
      await this.notificationsService.delete(data.notificationId, client.userId);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Delete notification error for user ${client.userId}: ${error.message}`,
        error.stack,
      );
      return { error: 'Failed to delete notification' };
    }
  }

  // ============================================================
  // SERVER-INITIATED BROADCASTS
  // ============================================================

  /**
   * Broadcast a new notification to the target user
   * Called when a notification is created (via event listener)
   */
  private broadcastNotification(payload: {
    userId: string;
    notification: any;
  }) {
    try {
      // Send to all sockets of the target user
      this.server.to(`user:${payload.userId}`).emit('notifications:new', {
        notification: payload.notification,
      });

      // Also broadcast updated unread count
      this.notificationsService.getUnreadCount(payload.userId).then((count) => {
        this.server.to(`user:${payload.userId}`).emit('notifications:unread-count', {
          unreadCount: count,
        });
      });

      this.logger.debug(`Broadcasted new notification to user ${payload.userId}`);
    } catch (error) {
      this.logger.error(
        `Broadcast notification error: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Notify user of unread count update
   */
  public broadcastUnreadCountUpdate(userId: string, unreadCount: number) {
    this.server.to(`user:${userId}`).emit('notifications:unread-count', {
      unreadCount,
    });
  }
}
