import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommentsController } from './controllers/comments.controller';
import { PostsController } from './controllers/posts.controller';
import { CommentsService } from './services/comments.service';
import { PostsService } from './services/posts.service';
import { LikesService } from './services/likes.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [CommentsController, PostsController],
  providers: [CommentsService, PostsService, LikesService],
  exports: [CommentsService, PostsService, LikesService],
})
export class ContentModule {}

