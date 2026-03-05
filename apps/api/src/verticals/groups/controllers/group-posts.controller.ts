import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { GroupPostsService } from '../services/group-posts.service';

class CreateGroupPostDto {
  content: string;
  type?: string;
  mediaUrl?: string;
}

@Controller('groups/:groupId/posts')
@UseGuards(JwtAuthGuard)
export class GroupPostsController {
  constructor(private readonly groupPostsService: GroupPostsService) {}

  @Get()
  @Public()
  async getPosts(
    @Param('groupId') groupId: string,
    @Request() req,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user?.id;
    return this.groupPostsService.getGroupPosts(groupId, userId, cursor, limit);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @Param('groupId') groupId: string,
    @Request() req,
    @Body() dto: CreateGroupPostDto,
  ) {
    return this.groupPostsService.createGroupPost(groupId, req.user.id, dto.content, dto.type, dto.mediaUrl);
  }
}
