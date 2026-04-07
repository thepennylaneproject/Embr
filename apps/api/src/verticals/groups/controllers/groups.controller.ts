import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { GroupsService } from '../services/groups.service';
import { CreateGroupDto, UpdateGroupDto, GroupSearchDto } from '../dto/group.dto';
import { RequestWithUser } from '../../../shared/types/request-with-user';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: RequestWithUser, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(req.user.id, dto);
  }

  @Get()
  @Public()
  async findAll(@Query() searchDto: GroupSearchDto) {
    return this.groupsService.findAll(searchDto);
  }

  @Get('me')
  async getMyGroups(@Request() req: RequestWithUser) {
    return this.groupsService.getUserGroups(req.user.id);
  }

  @Get(':slug')
  @Public()
  async findBySlug(@Param('slug') slug: string, @Request() req: RequestWithUser) {
    const userId = req.user?.id;
    return this.groupsService.findBySlug(slug, userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Request() req: RequestWithUser, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.groupsService.delete(id, req.user.id);
  }
}
