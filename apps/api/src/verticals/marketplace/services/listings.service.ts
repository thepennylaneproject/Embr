import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateListingDto, UpdateListingDto, ListingSearchDto } from '../dto/marketplace.dto';

const PLATFORM_FEE_PERCENT = 0.02; // 2%

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateListingDto) {
    return this.prisma.marketplaceListing.create({
      data: {
        sellerId: userId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        type: dto.type as any,
        condition: dto.condition as any,
        category: dto.category,
        tags: dto.tags ?? [],
        images: dto.images ?? [],
        quantity: dto.quantity ?? 1,
        allowOffers: dto.allowOffers ?? false,
        isShippable: dto.isShippable ?? false,
        shippingCost: dto.shippingCost,
        location: dto.location,
        groupId: dto.groupId,
        status: 'DRAFT',
      },
      include: {
        seller: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });
  }

  async publish(id: string, userId: string) {
    await this.assertSeller(id, userId);
    return this.prisma.marketplaceListing.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async findAll(dto: ListingSearchDto) {
    const limit = Math.min(dto.limit ?? 24, 60);
    const where: any = { status: 'ACTIVE', deletedAt: null };

    if (dto.q) {
      where.OR = [
        { title: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
        { tags: { has: dto.q } },
      ];
    }
    if (dto.type) where.type = dto.type;
    if (dto.category) where.category = dto.category;
    if (dto.condition) where.condition = dto.condition;
    if (dto.minPrice || dto.maxPrice) {
      where.price = {};
      if (dto.minPrice) where.price.gte = Number(dto.minPrice);
      if (dto.maxPrice) where.price.lte = Number(dto.maxPrice);
    }
    if (dto.location) where.location = { contains: dto.location, mode: 'insensitive' };
    if (dto.groupId) where.groupId = dto.groupId;
    if (dto.sellerId) where.sellerId = dto.sellerId;
    if (dto.cursor) where.createdAt = { lt: new Date(dto.cursor) };

    const listings = await this.prisma.marketplaceListing.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });

    const hasMore = listings.length > limit;
    const items = hasMore ? listings.slice(0, limit) : listings;
    return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null };
  }

  async findOne(id: string) {
    const listing = await this.prisma.marketplaceListing.findFirst({
      where: { id, deletedAt: null },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true, bio: true } },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            reviewer: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          },
        },
        _count: { select: { orders: true, reviews: true } },
        group: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');

    await this.prisma.marketplaceListing.update({ where: { id }, data: { viewCount: { increment: 1 } } });

    return listing;
  }

  async update(id: string, userId: string, dto: UpdateListingDto) {
    await this.assertSeller(id, userId);
    return this.prisma.marketplaceListing.update({
      where: { id },
      data: { ...dto, condition: dto.condition as any },
    });
  }

  async delete(id: string, userId: string) {
    await this.assertSeller(id, userId);
    return this.prisma.marketplaceListing.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getSellerListings(sellerId: string, status?: string) {
    const where: any = { sellerId, deletedAt: null };
    if (status) where.status = status;
    return this.prisma.marketplaceListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
  }

  async assertSeller(listingId: string, userId: string) {
    const listing = await this.prisma.marketplaceListing.findFirst({ where: { id: listingId, deletedAt: null } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== userId) throw new ForbiddenException('Not the seller');
    return listing;
  }

  getPlatformFee(amount: number) {
    return Math.round(amount * PLATFORM_FEE_PERCENT);
  }
}
