import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { GroupsController } from './controllers/groups.controller';
import { GroupMembersController } from './controllers/group-members.controller';
import { GroupPostsController } from './controllers/group-posts.controller';
import { AlertsController } from './controllers/alerts.controller';
import { PollsController } from './controllers/polls.controller';
import { TreasuryController } from './controllers/treasury.controller';
import { GroupsService } from './services/groups.service';
import { GroupMembersService } from './services/group-members.service';
import { GroupPostsService } from './services/group-posts.service';
import { AlertsService } from './services/alerts.service';
import { PollsService } from './services/polls.service';
import { TreasuryService } from './services/treasury.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [
    GroupsController,
    GroupMembersController,
    GroupPostsController,
    AlertsController,
    PollsController,
    TreasuryController,
  ],
  providers: [
    GroupsService,
    GroupMembersService,
    GroupPostsService,
    AlertsService,
    PollsService,
    TreasuryService,
  ],
  exports: [GroupsService, GroupMembersService, AlertsService, PollsService, TreasuryService],
})
export class GroupsModule {}
