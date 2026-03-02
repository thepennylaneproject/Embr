import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsListener } from './notifications.listener';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsEmailService } from './notifications.email';
import { NotificationsAnalyticsService } from './notifications.analytics';
import { NotificationsController } from './notifications.controller';
import { EmailService } from '../email/email.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    JwtModule.register({ secret: process.env.JWT_SECRET || 'dev-secret' }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsListener,
    NotificationsScheduler,
    NotificationsGateway,
    NotificationsEmailService,
    NotificationsAnalyticsService,
    EmailService,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
    NotificationsEmailService,
    NotificationsAnalyticsService,
  ],
})
export class NotificationsModule {}

