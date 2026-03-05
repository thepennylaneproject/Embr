import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { MutualAidController } from './controllers/mutual-aid.controller';
import { MutualAidResponsesController } from './controllers/mutual-aid-responses.controller';
import { MutualAidService } from './services/mutual-aid.service';
import { MutualAidResponsesService } from './services/mutual-aid-responses.service';
import { MutualAidScheduler } from './mutual-aid.scheduler';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  controllers: [MutualAidController, MutualAidResponsesController],
  providers: [MutualAidService, MutualAidResponsesService, MutualAidScheduler],
  exports: [MutualAidService],
})
export class MutualAidModule {}
