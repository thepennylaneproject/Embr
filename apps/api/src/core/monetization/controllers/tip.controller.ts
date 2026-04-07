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
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EmailVerifiedGuard } from '../../auth/guards/email-verified.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TipService } from '../services/tip.service';
import { CreateTipDto, GetTipsQueryDto } from '../dto/tip.dto';
import { RequestWithUser } from '../../../shared/types/request-with-user';

@Controller('tips')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard, RolesGuard)
export class TipController {
  constructor(private tipService: TipService) {}

  /**
   * POST /tips
   * Create a tip
   */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async createTip(@Request() req: RequestWithUser, @Body() dto: CreateTipDto) {
    return this.tipService.createTip(req.user.id, dto);
  }

  /**
   * GET /tips
   * Get tips for current user (sent or received)
   */
  @Get()
  async getTips(@Request() req: RequestWithUser, @Query() query: GetTipsQueryDto) {
    return this.tipService.getTips(req.user.id, query);
  }

  /**
   * GET /tips/stats
   * Get tip statistics for current user
   */
  @Get('stats')
  async getTipStats(
    @Request() req: RequestWithUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.tipService.getTipStats(req.user.id, start, end);
  }

  /**
   * GET /tips/:id
   * Get a specific tip — only accessible by the sender, recipient, or an admin
   */
  @Get(':id')
  async getTip(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.tipService.getTipById(id, req.user.id, req.user.role);
  }

  /**
   * POST /tips/:id/refund (admin only)
   * Refund a tip
   */
  @Post(':id/refund')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async refundTip(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.tipService.refundTip(id, reason);
  }

  /**
   * GET /tips/post/:postId
   * Get all tips for a specific post — restricted to the post author
   */
  @Get('post/:postId')
  async getTipsByPost(
    @Request() req: RequestWithUser,
    @Param('postId') postId: string,
    @Query() query: GetTipsQueryDto,
  ) {
    return this.tipService.getPostTips(req.user.id, postId, query);
  }

  /**
   * GET /tips/user/:userId/received
   * Get tips received by a user — restricted to the user themselves
   */
  @Get('user/:userId/received')
  async getTipsReceivedByUser(
    @Request() req: RequestWithUser,
    @Param('userId') userId: string,
    @Query() query: GetTipsQueryDto,
  ) {
    if (req.user.id !== userId) {
      throw new ForbiddenException('You can only view your own received tips');
    }
    return this.tipService.getTips(userId, { ...query, type: 'received' });
  }
}
