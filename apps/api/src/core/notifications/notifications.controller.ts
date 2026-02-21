/**
 * Notifications Controller
 * REST API endpoints for notification management
 */

import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get notifications for the current user
   * GET /notifications
   */
  @Get()
  async getNotifications(
    @GetUser('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findAll(userId, {
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 20, 50),
      unreadOnly: unreadOnly === 'true',
    });
  }

  /**
   * Get unread notification count
   * GET /notifications/count
   */
  @Get('count')
  async getUnreadCount(@GetUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  /**
   * Get a single notification
   * GET /notifications/:id
   */
  @Get(':id')
  async getNotification(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @GetUser('id') userId: string,
  ) {
    return this.notificationsService.findOne(notificationId, userId);
  }

  /**
   * Mark a single notification as read
   * PATCH /notifications/:id/read
   */
  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @GetUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(notificationId, userId);
  }

  /**
   * Mark all notifications as read
   * PATCH /notifications/read-all
   */
  @Patch('read-all')
  async markAllAsRead(@GetUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  /**
   * Delete a single notification
   * DELETE /notifications/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @GetUser('id') userId: string,
  ) {
    return this.notificationsService.delete(notificationId, userId);
  }

  /**
   * Delete all read notifications
   * DELETE /notifications/read
   */
  @Delete('read')
  @HttpCode(HttpStatus.OK)
  async deleteAllRead(@GetUser('id') userId: string) {
    return this.notificationsService.deleteAllRead(userId);
  }
}
