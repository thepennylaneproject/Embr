import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TreasuryService } from '../services/treasury.service';
import { ContributeDto, DisburseDto } from '../dto/organizing.dto';
import { RequestWithUser } from '../../../shared/types/request-with-user';

@Controller('groups/:groupId/treasury')
@UseGuards(JwtAuthGuard)
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Get()
  async get(@Param('groupId') groupId: string, @Request() req: RequestWithUser) {
    return this.treasuryService.getTreasury(groupId, req.user.id);
  }

  @Post('contribute')
  @HttpCode(HttpStatus.OK)
  async contribute(@Param('groupId') groupId: string, @Request() req: RequestWithUser, @Body() dto: ContributeDto) {
    return this.treasuryService.contribute(groupId, req.user.id, dto);
  }

  @Post('disburse')
  @HttpCode(HttpStatus.OK)
  async disburse(@Param('groupId') groupId: string, @Request() req: RequestWithUser, @Body() dto: DisburseDto) {
    return this.treasuryService.disburse(groupId, req.user.id, dto);
  }
}
