import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { CreateOfferDto } from '../dto/marketplace.dto';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createOffer(listingId: string, buyerId: string, dto: CreateOfferDto) {
    const listing = await this.prisma.marketplaceListing.findFirst({
      where: { id: listingId, status: 'ACTIVE', deletedAt: null },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (!listing.allowOffers) throw new BadRequestException('This listing does not accept offers');
    if (listing.sellerId === buyerId) throw new ForbiddenException('Cannot make an offer on your own listing');

    const existing = await this.prisma.marketplaceOffer.findFirst({
      where: { listingId, buyerId, status: 'PENDING' },
    });
    if (existing) throw new ConflictException('You already have a pending offer on this listing');

    const offer = await this.prisma.marketplaceOffer.create({
      data: {
        listingId,
        buyerId,
        amount: dto.amount,
        message: dto.message,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      include: {
        buyer: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });

    await this.notifications.create({
      userId: listing.sellerId,
      type: 'MARKETPLACE_OFFER',
      title: 'New offer on your listing',
      message: `You received an offer on "${listing.title}"`,
      actorId: buyerId,
      referenceId: listingId,
      referenceType: 'marketplace_listing',
    });

    return offer;
  }

  async acceptOffer(offerId: string, sellerId: string) {
    const offer = await this.prisma.marketplaceOffer.findUnique({
      where: { id: offerId },
      include: { listing: true },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.listing.sellerId !== sellerId) throw new ForbiddenException('Not the seller');
    if (offer.status !== 'PENDING') throw new BadRequestException('Offer is no longer pending');

    await this.prisma.marketplaceOffer.update({ where: { id: offerId }, data: { status: 'ACCEPTED' } });

    await this.notifications.create({
      userId: offer.buyerId,
      type: 'MARKETPLACE_OFFER_ACCEPTED',
      title: 'Your offer was accepted',
      message: `Your offer on "${offer.listing.title}" was accepted`,
      referenceId: offer.listingId,
      referenceType: 'marketplace_listing',
    });

    return { success: true };
  }

  async declineOffer(offerId: string, sellerId: string) {
    const offer = await this.prisma.marketplaceOffer.findUnique({
      where: { id: offerId },
      include: { listing: true },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.listing.sellerId !== sellerId) throw new ForbiddenException('Not the seller');
    await this.prisma.marketplaceOffer.update({ where: { id: offerId }, data: { status: 'DECLINED' } });
    return { success: true };
  }

  async withdrawOffer(offerId: string, buyerId: string) {
    const offer = await this.prisma.marketplaceOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.buyerId !== buyerId) throw new ForbiddenException('Not your offer');
    await this.prisma.marketplaceOffer.update({ where: { id: offerId }, data: { status: 'WITHDRAWN' } });
    return { success: true };
  }

  async getListingOffers(listingId: string, sellerId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.sellerId !== sellerId) throw new ForbiddenException('Not the seller');
    return this.prisma.marketplaceOffer.findMany({
      where: { listingId, status: 'PENDING' },
      include: {
        buyer: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
