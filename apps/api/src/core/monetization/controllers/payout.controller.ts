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
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EmailVerifiedGuard } from '../../auth/guards/email-verified.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PayoutService } from '../services/payout.service';
import {
  CreatePayoutRequestDto,
  ApprovePayoutDto,
  GetPayoutsQueryDto,
} from '../dto/payout.dto';

@Controller('payouts')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard, RolesGuard)
export class PayoutController {
  constructor(private payoutService: PayoutService) {}

  /**
   * POST /payouts/request
   * Create a payout request
   */
  @Post('request')
  @Throttle({ default: { limit: 5, ttl: 86400000 } }) // 5 per day
  @HttpCode(HttpStatus.CREATED)
  async createPayoutRequest(
    @Request() req,
    @Body() dto: CreatePayoutRequestDto,
  ) {
    return this.payoutService.createPayoutRequest(req.user.id, dto);
  }

  /**
   * GET /payouts
   * Get payouts for current user
   */
  @Get()
  async getPayouts(@Request() req, @Query() query: GetPayoutsQueryDto) {
    return this.payoutService.getPayouts(req.user.id, query);
  }

  /**
   * GET /payouts/stats
   * Get payout statistics
   */
  @Get('stats')
  async getPayoutStats(@Request() req) {
    return this.payoutService.getPayoutStats(req.user.id);
  }

  /**
   * GET /payouts/pending (admin only)
   * Get all pending payouts for admin review
   */
  @Get('pending')
  @Roles('ADMIN')
  async getPendingPayouts() {
    return this.payoutService.getPendingPayouts();
  }

  /**
   * POST /payouts/:id/approve (admin only)
   * Approve or reject a payout request
   */
  @Post(':id/approve')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async approvePayout(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: Partial<ApprovePayoutDto>,
  ) {
    return this.payoutService.approvePayout(req.user.id, {
      payoutRequestId: id,
      ...dto,
    });
  }

  /**
   * POST /payouts/:id/reject (admin only)
   * Reject a payout request
   */
  @Post(':id/reject')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async rejectPayout(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.payoutService.approvePayout(req.user.id, {
      payoutRequestId: id,
      approve: false,
      rejectionReason: reason,
    });
  }

  /**
   * GET /payouts/:id
   * Get a specific payout
   */
  @Get(':id')
  async getPayout(@Request() req, @Param('id') id: string) {
    // TODO: Implement single payout fetch with permission check
    return { id }; // Placeholder
  }
}
