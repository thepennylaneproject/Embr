import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommentsController } from './controllers/comments.controller';
import { PostsController } from './controllers/posts.controller';
import { CommentsService } from './services/comments.service';
import { PostsService } from './services/posts.service';
import { LikesService } from './services/likes.service';
import { SafetyModule } from '../../../core/safety/safety.module';
import { RateLimitModule } from '../../../core/rate-limit/rate-limit.module';
import { PaginationModule } from '../../../core/pagination/pagination.module';
import { CacheModule } from '../../../core/cache/cache.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    SafetyModule,
    RateLimitModule,
    PaginationModule,
    CacheModule,
  ],
  controllers: [CommentsController, PostsController],
  providers: [CommentsService, PostsService, LikesService],
  exports: [CommentsService, PostsService, LikesService],
})
export class ContentModule {}

