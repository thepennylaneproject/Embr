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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { MutualAidService } from '../services/mutual-aid.service';
import {
  CreateMutualAidPostDto,
  UpdateMutualAidPostDto,
  MutualAidSearchDto,
} from '../dto/mutual-aid.dto';
import { RequestWithUser } from '../../../shared/types/request-with-user';

@Controller('mutual-aid')
@UseGuards(JwtAuthGuard)
export class MutualAidController {
  constructor(private readonly mutualAidService: MutualAidService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: RequestWithUser, @Body() dto: CreateMutualAidPostDto) {
    return this.mutualAidService.create(req.user.id, dto);
  }

  @Get()
  @Public()
  async findAll(@Query() searchDto: MutualAidSearchDto) {
    return this.mutualAidService.findAll(searchDto);
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.mutualAidService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Request() req: RequestWithUser, @Body() dto: UpdateMutualAidPostDto) {
    return this.mutualAidService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.mutualAidService.delete(id, req.user.id);
  }

  @Post(':id/fulfill')
  @HttpCode(HttpStatus.OK)
  async markFulfilled(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.mutualAidService.markFulfilled(id, req.user.id);
  }
}
