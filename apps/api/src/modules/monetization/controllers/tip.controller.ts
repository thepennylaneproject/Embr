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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TipService } from '../services/tip.service';
import { CreateTipDto, GetTipsQueryDto } from '../dto/tip.dto';

@Controller('tips')
@UseGuards(JwtAuthGuard)
export class TipController {
  constructor(private tipService: TipService) {}

  /**
   * POST /tips
   * Create a tip
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTip(@Request() req, @Body() dto: CreateTipDto) {
    return this.tipService.createTip(req.user.id, dto);
  }

  /**
   * GET /tips
   * Get tips for current user (sent or received)
   */
  @Get()
  async getTips(@Request() req, @Query() query: GetTipsQueryDto) {
    return this.tipService.getTips(req.user.id, query);
  }

  /**
   * GET /tips/stats
   * Get tip statistics for current user
   */
  @Get('stats')
  async getTipStats(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.tipService.getTipStats(req.user.id, start, end);
  }

  /**
   * GET /tips/:id
   * Get a specific tip
   */
  @Get(':id')
  async getTip(@Param('id') id: string) {
    // Implementation would fetch single tip
    // Ensure user has permission to view (sender or recipient)
    return { id }; // Placeholder
  }

  /**
   * POST /tips/:id/refund (admin only)
   * Refund a tip
   */
  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  async refundTip(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    // TODO: Add admin guard
    return this.tipService.refundTip(id, reason);
  }

  /**
   * GET /tips/post/:postId
   * Get all tips for a specific post
   */
  @Get('post/:postId')
  async getTipsByPost(
    @Param('postId') postId: string,
    @Query() query: GetTipsQueryDto,
  ) {
    return this.tipService.getTips('', { ...query, postId });
  }

  /**
   * GET /tips/user/:userId/received
   * Get tips received by a user
   */
  @Get('user/:userId/received')
  async getTipsReceivedByUser(
    @Param('userId') userId: string,
    @Query() query: GetTipsQueryDto,
  ) {
    return this.tipService.getTips(userId, { ...query, type: 'received' });
  }
}
