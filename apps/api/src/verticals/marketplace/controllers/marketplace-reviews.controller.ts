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
import { Public } from '../../../core/auth/decorators/public.decorator';
import { MarketplaceReviewsService } from '../services/marketplace-reviews.service';
import { CreateReviewDto } from '../dto/marketplace.dto';
import { RequestWithUser } from '../../../shared/types/request-with-user';

@Controller('marketplace')
@UseGuards(JwtAuthGuard)
export class MarketplaceReviewsController {
  constructor(private readonly reviewsService: MarketplaceReviewsService) {}

  @Post('orders/:orderId/review')
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @Param('orderId') orderId: string,
    @Request() req: RequestWithUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(orderId, req.user.id, dto);
  }

  @Get('listings/:listingId/reviews')
  @Public()
  async getListingReviews(@Param('listingId') listingId: string) {
    return this.reviewsService.getListingReviews(listingId);
  }

  @Get('sellers/:sellerId/reviews')
  @Public()
  async getSellerReviews(@Param('sellerId') sellerId: string) {
    return this.reviewsService.getSellerReviews(sellerId);
  }
}
