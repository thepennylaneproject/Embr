import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { EventsController } from './controllers/events.controller';
import { EventsService } from './services/events.service';
import { EventAttendeesService } from './services/event-attendees.service';
import { EventRecapService } from './services/event-recap.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [EventsController],
  providers: [EventsService, EventAttendeesService, EventRecapService],
  exports: [EventsService],
})
export class EventsModule {}
