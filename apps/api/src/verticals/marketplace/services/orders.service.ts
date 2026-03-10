import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { ListingsService } from './listings.service';
import { CreateCheckoutDto, CreateOrderDto } from '../dto/marketplace.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly listingsService: ListingsService,
  ) {}

  async createOrder(buyerId: string, dto: CreateOrderDto) {
    const order = await this.prisma.$transaction(async (tx) => {
      const listing = await tx.marketplaceListing.findFirst({
        where: { id: dto.listingId, status: 'ACTIVE', deletedAt: null },
      });
      if (!listing) throw new NotFoundException('Listing not found or not available');
      if (listing.sellerId === buyerId) throw new BadRequestException('Cannot purchase your own listing');

      const qty = dto.quantity ?? 1;
      if (qty > listing.quantity) throw new BadRequestException('Requested quantity exceeds available stock');

      const subtotal = listing.price * qty;
      const shippingCost = listing.isShippable ? (listing.shippingCost ?? 0) : 0;
      const totalBeforeFee = subtotal + shippingCost;
      const platformFee = this.listingsService.getPlatformFee(totalBeforeFee);
      const totalAmount = totalBeforeFee + platformFee;

      return tx.marketplaceOrder.create({
        data: {
          listingId: listing.id,
          buyerId,
          sellerId: listing.sellerId,
          quantity: qty,
          subtotal,
          shippingCost,
          platformFee,
          totalAmount,
          shippingAddress: dto.shippingAddress as any,
          notes: dto.notes,
          status: 'PENDING',
        },
        include: {
          listing: { select: { title: true, images: true } },
          seller: { select: { id: true, username: true } },
          buyer: { select: { id: true, username: true } },
        },
      });
    });

    await this.notifications.create({
      userId: order.sellerId,
      type: 'MARKETPLACE_ORDER',
      title: 'New order',
      message: `You have a new order for "${order.listing.title}"`,
      actorId: buyerId,
      referenceId: order.id,
      referenceType: 'marketplace_order',
    });

    return order;
  }

  async checkout(buyerId: string, dto: CreateCheckoutDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Checkout requires at least one item');
    }

    const normalizedKey = dto.idempotencyKey?.trim();
    if (normalizedKey) {
      const existingOrders = await this.prisma.marketplaceOrder.findMany({
        where: {
          buyerId,
          notes: { contains: `[checkout:${normalizedKey}]` },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          listing: { select: { id: true, title: true, images: true } },
          seller: { select: { id: true, username: true } },
          buyer: { select: { id: true, username: true } },
        },
      });

      if (existingOrders.length > 0) {
        const totalAmount = existingOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        return {
          checkoutId: normalizedKey,
          status: 'confirmed',
          idempotentReplay: true,
          orderCount: existingOrders.length,
          totalAmount,
          orders: existingOrders,
        };
      }
    }

    const checkoutId = normalizedKey || `checkout_${Date.now()}`;
    const baseNotes = dto.notes?.trim();
    const taggedNotes = [baseNotes, `[checkout:${checkoutId}]`].filter(Boolean).join(' ');

    const orders = await this.prisma.$transaction(async (tx) => {
      const createdOrders: any[] = [];
      for (const item of dto.items) {
        const listing = await tx.marketplaceListing.findFirst({
          where: { id: item.listingId, status: 'ACTIVE', deletedAt: null },
        });
        if (!listing) {
          throw new NotFoundException('Listing not found or not available');
        }
        if (listing.sellerId === buyerId) {
          throw new BadRequestException('Cannot purchase your own listing');
        }
        const qty = item.quantity ?? 1;
        if (qty > listing.quantity) {
          throw new BadRequestException('Requested quantity exceeds available stock');
        }

        const subtotal = listing.price * qty;
        const shippingCost = listing.isShippable ? (listing.shippingCost ?? 0) : 0;
        const totalBeforeFee = subtotal + shippingCost;
        const platformFee = this.listingsService.getPlatformFee(totalBeforeFee);
        const totalAmount = totalBeforeFee + platformFee;

        const order = await tx.marketplaceOrder.create({
          data: {
            listingId: listing.id,
            buyerId,
            sellerId: listing.sellerId,
            quantity: qty,
            subtotal,
            shippingCost,
            platformFee,
            totalAmount,
            shippingAddress: dto.shippingAddress as any,
            notes: taggedNotes,
            status: 'PENDING',
          },
          include: {
            listing: { select: { id: true, title: true, images: true } },
            seller: { select: { id: true, username: true } },
            buyer: { select: { id: true, username: true } },
          },
        });
        createdOrders.push(order);
      }
      return createdOrders;
    });

    await Promise.all(
      orders.map((order) =>
        this.notifications.create({
          userId: order.sellerId,
          type: 'MARKETPLACE_ORDER',
          title: 'New order',
          message: `You have a new order for "${order.listing.title}"`,
          actorId: buyerId,
          referenceId: order.id,
          referenceType: 'marketplace_order',
        }),
      ),
    );

    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    return {
      checkoutId,
      status: 'confirmed',
      idempotentReplay: false,
      orderCount: orders.length,
      totalAmount,
      orders,
    };
  }

  async markPaid(orderId: string, stripePaymentIntentId: string) {
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const decremented = await tx.marketplaceListing.updateMany({
        where: {
          id: order.listingId,
          quantity: { gte: order.quantity },
        },
        data: { quantity: { decrement: order.quantity } },
      });

      if (decremented.count !== 1) {
        throw new BadRequestException('Listing is out of stock');
      }

      return tx.marketplaceOrder.update({
        where: { id: orderId },
        data: { status: 'PAID', stripePaymentIntentId },
      });
    });

    return updatedOrder;
  }

  async markShipped(orderId: string, sellerId: string, trackingNumber: string) {
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.sellerId !== sellerId) throw new ForbiddenException('Not the seller');
    if (order.status !== 'PAID' && order.status !== 'PROCESSING') {
      throw new BadRequestException('Order is not in a shippable state');
    }

    const updated = await this.prisma.marketplaceOrder.update({
      where: { id: orderId },
      data: { status: 'SHIPPED', trackingNumber },
    });

    await this.notifications.create({
      userId: order.buyerId,
      type: 'MARKETPLACE_SHIPPED',
      title: 'Your order has shipped',
      message: `Tracking: ${trackingNumber}`,
      referenceId: orderId,
      referenceType: 'marketplace_order',
    });

    return updated;
  }

  async markDelivered(orderId: string, buyerId: string) {
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new ForbiddenException('Not the buyer');
    return this.prisma.marketplaceOrder.update({
      where: { id: orderId },
      data: { status: 'DELIVERED' },
    });
  }

  async complete(orderId: string, buyerId: string) {
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new ForbiddenException('Not the buyer');
    if (!['DELIVERED', 'PAID'].includes(order.status)) {
      throw new BadRequestException('Order cannot be completed from current status');
    }
    return this.prisma.marketplaceOrder.update({
      where: { id: orderId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  async getBuyerOrders(buyerId: string, status?: string) {
    const where: any = { buyerId };
    if (status) where.status = status;
    return this.prisma.marketplaceOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { id: true, title: true, images: true } },
        seller: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        review: true,
      },
    });
  }

  async getSellerOrders(sellerId: string, status?: string) {
    const where: any = { sellerId };
    if (status) where.status = status;
    return this.prisma.marketplaceOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        listing: { select: { id: true, title: true, images: true } },
        buyer: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        review: true,
      },
    });
  }
}
