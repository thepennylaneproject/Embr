import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WalletService } from '../services/wallet.service';
import { TransactionService } from '../services/transaction.service';
import { GetTransactionsQueryDto } from '../dto/wallet.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private walletService: WalletService,
    private transactionService: TransactionService,
  ) {}

  /**
   * GET /wallet
   * Get current user's wallet
   */
  @Get()
  async getWallet(@Request() req) {
    return this.walletService.getWallet(req.user.id);
  }

  /**
   * GET /wallet/balance
   * Get wallet balance with available/pending breakdown
   */
  @Get('balance')
  async getBalance(@Request() req) {
    return this.walletService.getWalletBalance(req.user.id);
  }

  /**
   * GET /wallet/stats
   * Get wallet statistics
   */
  @Get('stats')
  async getStats(@Request() req) {
    return this.walletService.getWalletStats(req.user.id);
  }

  /**
   * GET /wallet/transactions
   * Get transaction history
   */
  @Get('transactions')
  async getTransactions(
    @Request() req,
    @Query() query: GetTransactionsQueryDto,
  ) {
    const filters = {
      type: query.type,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page || 1,
      limit: query.limit || 20,
    };

    return this.transactionService.getUserTransactions(req.user.id, filters);
  }

  /**
   * GET /wallet/verify-integrity
   * Verify wallet balance integrity (admin or user)
   */
  @Get('verify-integrity')
  async verifyIntegrity(@Request() req) {
    return this.transactionService.verifyWalletIntegrity(req.user.id);
  }

  /**
   * GET /wallet/financial-summary
   * Get financial summary for date range
   */
  @Get('financial-summary')
  async getFinancialSummary(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return this.transactionService.getFinancialSummary(req.user.id, start, end);
  }

  /**
   * GET /wallet/top-earners
   * Get top earners leaderboard
   */
  @Get('top-earners')
  async getTopEarners(
    @Query('limit') limit?: number,
    @Query('period') period?: 'day' | 'week' | 'month' | 'all',
  ) {
    return this.walletService.getTopEarners(limit, period);
  }

  /**
   * POST /wallet/add-funds (admin only)
   * Add funds to a wallet for testing
   */
  @Post('add-funds')
  @HttpCode(HttpStatus.OK)
  async addFunds(
    @Request() req,
    @Body('amount') amount: number,
    @Body('reason') reason: string,
  ) {
    // TODO: Add admin guard
    return this.walletService.addFunds(req.user.id, amount, reason);
  }
}
