import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StripeConnectService } from '../services/stripe-connect.service';
import {
  CreateStripeConnectAccountDto,
  GetStripeAccountLinkDto,
} from '../dto/wallet.dto';

@Controller('stripe-connect')
@UseGuards(JwtAuthGuard)
export class StripeConnectController {
  constructor(private stripeConnectService: StripeConnectService) {}

  /**
   * POST /stripe-connect/account
   * Create Stripe Connect account and get onboarding URL
   */
  @Post('account')
  @HttpCode(HttpStatus.CREATED)
  async createAccount(
    @Request() req,
    @Body() dto: CreateStripeConnectAccountDto,
  ) {
    return this.stripeConnectService.createConnectAccount(req.user.id, dto);
  }

  /**
   * GET /stripe-connect/status
   * Get Stripe Connect account status
   */
  @Get('status')
  async getAccountStatus(@Request() req) {
    return this.stripeConnectService.getAccountStatus(req.user.id);
  }

  /**
   * GET /stripe-connect/account
   * Get Stripe Connect account details
   */
  @Get('account')
  async getAccountDetails(@Request() req) {
    return this.stripeConnectService.getAccountDetails(req.user.id);
  }

  /**
   * POST /stripe-connect/account-link
   * Get new account link for re-onboarding
   */
  @Post('account-link')
  @HttpCode(HttpStatus.OK)
  async getAccountLink(@Request() req, @Body() dto: GetStripeAccountLinkDto) {
    return this.stripeConnectService.getAccountLink(req.user.id, dto);
  }

  /**
   * POST /stripe-connect/complete
   * Complete onboarding after user returns from Stripe
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(@Request() req) {
    return this.stripeConnectService.completeOnboarding(req.user.id);
  }

  /**
   * DELETE /stripe-connect/account (admin only)
   * Delete Stripe Connect account
   */
  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Request() req) {
    // TODO: Add admin guard or allow users to delete own account
    await this.stripeConnectService.deleteAccount(req.user.id);
  }
}
