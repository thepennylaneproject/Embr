import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { AlertsService } from '../services/alerts.service';
import { CreateAlertDto } from '../dto/organizing.dto';
import { RequestWithUser } from '../../../shared/types/request-with-user';

@Controller('groups/:groupId/alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Param('groupId') groupId: string, @Request() req: RequestWithUser, @Body() dto: CreateAlertDto) {
    return this.alertsService.create(groupId, req.user.id, dto);
  }

  @Get()
  async findAll(
    @Param('groupId') groupId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.alertsService.findAll(groupId, includeInactive === 'true');
  }

  @Patch(':alertId/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param('groupId') groupId: string,
    @Param('alertId') alertId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.alertsService.deactivate(groupId, alertId, req.user.id);
  }
}
