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
    const checkoutId = normalizedKey || `checkout_${Date.now()}`;
    const baseNotes = dto.notes?.trim();
    const taggedNotes = [baseNotes, `[checkout:${checkoutId}]`].filter(Boolean).join(' ');

    // Both the idempotency check and order creation run inside a single serializable
    // transaction, eliminating the TOCTOU race condition where two concurrent requests
    // with the same idempotency key could both pass the check and create duplicate orders.
    // PostgreSQL's Serializable isolation detects concurrent read-write dependencies and
    // aborts all but one conflicting transaction, ensuring only one checkout commits per key.
    const { orders, idempotentReplay } = await this.prisma.$transaction(
      async (tx) => {
        if (normalizedKey) {
          const existingOrders = await tx.marketplaceOrder.findMany({
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
            return { orders: existingOrders, idempotentReplay: true };
          }
        }

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
        return { orders: createdOrders, idempotentReplay: false };
      },
      { isolationLevel: 'Serializable' },
    );

    if (!idempotentReplay) {
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
    }

    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    return {
      checkoutId,
      status: 'confirmed',
      idempotentReplay,
      orderCount: orders.length,
      totalAmount,
      orders,
    };
  }

  async confirmPayment(orderId: string, buyerId: string) {
    const order = await this.prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new ForbiddenException('Not the buyer');
    if (order.status !== 'PENDING') throw new BadRequestException('Order is not pending');
    return this.markPaid(orderId, `simulated_${Date.now()}_${orderId}`);
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
