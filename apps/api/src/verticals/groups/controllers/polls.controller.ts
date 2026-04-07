import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { PollsService } from '../services/polls.service';
import { CreatePollDto, VoteDto } from '../dto/organizing.dto';
import { RequestWithUser } from '../../../shared/types/request-with-user';

@Controller('groups/:groupId/polls')
@UseGuards(JwtAuthGuard)
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Param('groupId') groupId: string, @Request() req: RequestWithUser, @Body() dto: CreatePollDto) {
    return this.pollsService.create(groupId, req.user.id, dto);
  }

  @Get()
  async findAll(@Param('groupId') groupId: string) {
    return this.pollsService.findAll(groupId);
  }

  @Post(':pollId/vote')
  @HttpCode(HttpStatus.OK)
  async vote(
    @Param('groupId') groupId: string,
    @Param('pollId') pollId: string,
    @Request() req: RequestWithUser,
    @Body() dto: VoteDto,
  ) {
    return this.pollsService.vote(groupId, pollId, req.user.id, dto);
  }

  @Patch(':pollId/close')
  @HttpCode(HttpStatus.OK)
  async close(
    @Param('groupId') groupId: string,
    @Param('pollId') pollId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.pollsService.close(groupId, pollId, req.user.id);
  }

  @Get(':pollId/results')
  async getResults(
    @Param('groupId') groupId: string,
    @Param('pollId') pollId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.pollsService.getResults(pollId, req.user.id);
  }
}
