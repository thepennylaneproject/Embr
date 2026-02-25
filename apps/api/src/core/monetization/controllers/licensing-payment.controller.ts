import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Inject,
  Logger,
} from '@nestjs/common';
import { LicensingPaymentService } from '../services/licensing-payment.service';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';

@Controller('api/music/licensing')
@UseGuards(JwtAuthGuard)
export class LicensingPaymentController {
  private readonly logger = new Logger(LicensingPaymentController.name);

  constructor(
    private licensingPaymentService: LicensingPaymentService,
  ) {}

  /**
   * POST /api/music/licensing/:trackId/checkout
   * Create a payment intent for licensing a track
   */
  @Post(':trackId/checkout')
  async createLicensePayment(
    @Param('trackId') trackId: string,
    @Body('creatorId') creatorId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      return { error: 'Not authenticated' };
    }

    if (!creatorId) {
      return { error: 'creatorId is required' };
    }

    try {
      const result = await this.licensingPaymentService.createLicensePayment({
        trackId,
        creatorId,
        userId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create license payment: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to create payment',
      };
    }
  }

  /**
   * GET /api/music/licensing/creator/:creatorId/licenses
   * Get all licenses purchased by a creator
   */
  @Get('creator/:creatorId/licenses')
  async getCreatorLicenses(
    @Param('creatorId') creatorId: string,
    @Request() req: any,
  ) {
    try {
      // Only allow users to view their own licenses
      if (req.user?.id !== creatorId) {
        return { error: 'Unauthorized' };
      }

      const licenses = await this.licensingPaymentService.getCreatorLicenses(
        creatorId,
        50,
      );

      return {
        success: true,
        data: licenses,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get creator licenses: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to fetch licenses',
      };
    }
  }

  /**
   * GET /api/music/licensing/artist/:artistId/earnings
   * Get licensing earnings for an artist
   */
  @Get('artist/:artistId/earnings')
  async getArtistEarnings(
    @Param('artistId') artistId: string,
    @Request() req: any,
  ) {
    try {
      // Get the artist record to verify ownership
      const artist = await (global as any).prisma.artist.findUnique({
        where: { id: artistId },
      });

      if (!artist) {
        return { error: 'Artist not found' };
      }

      // Only allow the artist owner to view their earnings
      if (req.user?.id !== artist.userId) {
        return { error: 'Unauthorized' };
      }

      const earnings = await this.licensingPaymentService.getArtistLicensingEarnings(
        artistId,
        30,
      );

      return {
        success: true,
        data: earnings,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get artist earnings: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to fetch earnings',
      };
    }
  }
}
