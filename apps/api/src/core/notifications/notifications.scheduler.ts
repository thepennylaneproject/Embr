/**
 * Notifications Scheduler
 * Handles scheduled tasks for notifications (cleanup, retention policy)
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(private notificationsService: NotificationsService) {}

  /**
   * Run daily at 2 AM UTC to clean up old notifications
   * Deletes notifications older than 90 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldNotifications() {
    try {
      const result = await this.notificationsService.cleanup(90);
      this.logger.log(
        `Notification cleanup completed: deleted ${result.count} notifications older than 90 days`,
      );
    } catch (error) {
      this.logger.error(
        `Notification cleanup failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
