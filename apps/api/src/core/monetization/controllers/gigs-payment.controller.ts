import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { GigsPaymentService } from '../services/gigs-payment.service';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';

@Controller('api/gigs/bookings')
@UseGuards(JwtAuthGuard)
export class GigsPaymentController {
  private readonly logger = new Logger(GigsPaymentController.name);

  constructor(
    private gigsPaymentService: GigsPaymentService,
  ) {}

  /**
   * POST /api/gigs/bookings/:gigId/checkout
   * Create a payment intent for booking a gig
   */
  @Post(':gigId/checkout')
  async createGigPayment(
    @Param('gigId') gigId: string,
    @Body('artistId') artistId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      return { error: 'Not authenticated' };
    }

    if (!artistId) {
      return { error: 'artistId is required' };
    }

    try {
      const result = await this.gigsPaymentService.createGigPayment({
        gigId,
        artistId,
        userId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create gig payment: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to create payment',
      };
    }
  }

  /**
   * GET /api/gigs/bookings/:bookingId
   * Get booking details
   */
  @Get(':bookingId')
  async getBooking(
    @Param('bookingId') bookingId: string,
    @Request() req: any,
  ) {
    try {
      const booking = await this.gigsPaymentService.getBookingDetails(bookingId);

      if (!booking) {
        return { error: 'Booking not found' };
      }

      // Verify authorization (buyer or artist or admin)
      if (req.user?.id !== booking.userId && req.user?.id !== booking.artistId) {
        return { error: 'Unauthorized' };
      }

      return {
        success: true,
        data: booking,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get booking: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to fetch booking',
      };
    }
  }

  /**
   * GET /api/gigs/bookings/user/my-bookings
   * Get current user's bookings (as buyer)
   */
  @Get('user/my-bookings')
  async getUserBookings(@Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return { error: 'Not authenticated' };
      }

      const bookings = await this.gigsPaymentService.getUserBookings(userId);

      return {
        success: true,
        data: bookings,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get user bookings: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to fetch bookings',
      };
    }
  }

  /**
   * GET /api/gigs/bookings/artist/my-bookings
   * Get artist's bookings (as service provider)
   */
  @Get('artist/my-bookings')
  async getArtistBookings(@Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return { error: 'Not authenticated' };
      }

      // Get artist record for this user
      const artist = await (global as any).prisma.artist.findFirst({
        where: { userId },
      });

      if (!artist) {
        return { error: 'Artist not found' };
      }

      const bookings = await this.gigsPaymentService.getArtistBookings(artist.id);

      return {
        success: true,
        data: bookings,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get artist bookings: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to fetch bookings',
      };
    }
  }

  /**
   * POST /api/gigs/bookings/:bookingId/cancel
   * Cancel a booking and process refund
   */
  @Post(':bookingId/cancel')
  async cancelBooking(
    @Param('bookingId') bookingId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    try {
      const booking = await this.gigsPaymentService.getBookingDetails(bookingId);

      if (!booking) {
        return { error: 'Booking not found' };
      }

      // Only buyer or artist can cancel
      if (req.user?.id !== booking.userId && req.user?.id !== booking.artistId) {
        return { error: 'Unauthorized' };
      }

      await this.gigsPaymentService.cancelBooking(bookingId, reason || 'User cancelled');

      return {
        success: true,
        message: 'Booking cancelled and refunded',
      };
    } catch (error: any) {
      this.logger.error(`Failed to cancel booking: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to cancel booking',
      };
    }
  }

  /**
   * POST /api/gigs/bookings/:bookingId/dispute
   * Create a dispute for a booking
   */
  @Post(':bookingId/dispute')
  async createDispute(
    @Param('bookingId') bookingId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return { error: 'Not authenticated' };
      }

      const dispute = await this.gigsPaymentService.createDispute(
        bookingId,
        reason,
        userId,
      );

      return {
        success: true,
        data: dispute,
        message: 'Dispute created. Support team will review within 24 hours.',
      };
    } catch (error: any) {
      this.logger.error(`Failed to create dispute: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to create dispute',
      };
    }
  }
}
