import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateReviewDto } from '../dto/marketplace.dto';

@Injectable()
export class MarketplaceReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(orderId: string, reviewerId: string, dto: CreateReviewDto) {
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== reviewerId) throw new ForbiddenException('Only the buyer can review');
    if (order.status !== 'COMPLETED') throw new ForbiddenException('Order must be completed before reviewing');

    const existing = await this.prisma.marketplaceReview.findUnique({ where: { orderId } });
    if (existing) throw new ConflictException('Review already submitted for this order');

    return this.prisma.marketplaceReview.create({
      data: {
        orderId,
        listingId: order.listingId,
        reviewerId,
        sellerId: order.sellerId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        reviewer: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });
  }

  async getListingReviews(listingId: string) {
    return this.prisma.marketplaceReview.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });
  }

  async getSellerReviews(sellerId: string) {
    const reviews = await this.prisma.marketplaceReview.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { id: true, title: true } },
        reviewer: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });
    const avgRating =
      reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
    return { reviews, avgRating, totalReviews: reviews.length };
  }
}
