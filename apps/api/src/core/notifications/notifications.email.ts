/**
 * Notifications Email Service
 * Sends email notifications for critical events
 * Works alongside in-app notifications
 */

import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../database/prisma.service';

interface EmailNotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
}

@Injectable()
export class NotificationsEmailService {
  private readonly logger = new Logger(NotificationsEmailService.name);

  constructor(
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  /**
   * Send email notification for critical events
   * Only sends for high-priority notifications or if user opted in
   */
  async sendEmailNotification(payload: EmailNotificationPayload) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true, profile: { select: { displayName: true } } },
      });

      if (!user) {
        return;
      }

      // Only send high-priority emails (critical events)
      // Users can opt-in to medium/low priority emails in preferences
      if (payload.priority !== 'high') {
        this.logger.debug(
          `Skipping email for non-critical notification: ${payload.type}`,
        );
        return;
      }

      const displayName = user.profile?.displayName || 'User';
      const subject = `${payload.title} - Embr`;

      const htmlContent = `
        <h1>${payload.title}</h1>
        <p>${payload.message}</p>
        ${
          payload.actionUrl
            ? `<p><a href="${payload.actionUrl}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Details</a></p>`
            : ''
        }
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">You received this email because you have an active Embr account. You can manage your notification preferences in your account settings.</p>
      `;

      await this.emailService.send({
        to: user.email,
        subject,
        html: htmlContent,
      });

      this.logger.log(
        `Email notification sent to user ${payload.userId} for ${payload.type}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email notification: ${error.message}`,
        error.stack,
      );
      // Don't throw - email failure shouldn't block notification
    }
  }

  /**
   * Send critical notifications (application accepted, moderation action, etc.)
   */
  async sendCriticalNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    actionUrl?: string,
  ) {
    await this.sendEmailNotification({
      userId,
      type,
      title,
      message,
      actionUrl,
      priority: 'high',
    });
  }

  /**
   * Send gig application accepted email
   */
  async sendGigApplicationAccepted(
    applicantId: string,
    gigTitle: string,
    gigId: string,
  ) {
    const actionUrl = `${process.env.APP_URL}/gigs/${gigId}`;

    await this.sendCriticalNotification(
      applicantId,
      'GIG_APPLICATION_ACCEPTED',
      'Application Accepted! 🎉',
      `Great news! Your application for "${gigTitle}" has been accepted. Review the details and get started.`,
      actionUrl,
    );
  }

  /**
   * Send moderation action notification
   */
  async sendModerationAction(userId: string, action: string, reason: string) {
    await this.sendCriticalNotification(
      userId,
      'MODERATION_ACTION',
      'Account Action Required',
      `Your account has been subject to a moderation action: ${action}. Reason: ${reason}. Please review the details in your account settings.`,
      `${process.env.APP_URL}/settings/safety`,
    );
  }

  /**
   * Send high-value tip received email
   */
  async sendHighValueTipReceived(
    recipientId: string,
    senderName: string,
    amount: number,
  ) {
    const amountUsd = (amount / 100).toFixed(2);

    await this.sendCriticalNotification(
      recipientId,
      'TIP_RECEIVED',
      `You Received a Tip! 💰`,
      `${senderName} sent you a tip of $${amountUsd}. Thank them and check your earnings.`,
      `${process.env.APP_URL}/notifications`,
    );
  }
}
