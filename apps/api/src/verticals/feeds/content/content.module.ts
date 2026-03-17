import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CommentsController } from './controllers/comments.controller';
import { PostsController } from './controllers/posts.controller';
import { CommentsService } from './services/comments.service';
import { PostsService } from './services/posts.service';
import { LikesService } from './services/likes.service';
import { ScheduledPostsService } from './services/scheduled-posts.service';
import { ScheduledPostsScheduler } from './scheduled-posts.scheduler';
import { SafetyModule } from '../../../core/safety/safety.module';
import { RateLimitModule } from '../../../core/rate-limit/rate-limit.module';
import { PaginationModule } from '../../../core/pagination/pagination.module';
import { CacheModule } from '../../../core/cache/cache.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    SafetyModule,
    RateLimitModule,
    PaginationModule,
    CacheModule,
  ],
  controllers: [CommentsController, PostsController],
  providers: [CommentsService, PostsService, LikesService, ScheduledPostsService, ScheduledPostsScheduler],
  exports: [CommentsService, PostsService, LikesService, ScheduledPostsService],
})
export class ContentModule {}

