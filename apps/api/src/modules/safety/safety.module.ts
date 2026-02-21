import { Module } from '@nestjs/common';
import { SafetyController } from './controllers/safety.controller';
import { ModerationActionsService } from './services/moderation-actions.service';
import { BlockingService } from './services/blocking.service';
import { ReportsService } from './services/reports.service';
import { AppealsService } from './services/appeals.service';
import { ContentFilterService } from './services/content-filter.service';
import { RolesGuard } from './guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SafetyController],
  providers: [
    ModerationActionsService,
    BlockingService,
    ReportsService,
    AppealsService,
    ContentFilterService,
    RolesGuard,
  ],
  exports: [
    ModerationActionsService,
    BlockingService,
    ReportsService,
    AppealsService,
    ContentFilterService,
  ],
})
export class SafetyModule {}
