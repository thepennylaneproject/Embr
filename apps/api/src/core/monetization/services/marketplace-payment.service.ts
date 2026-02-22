import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import Stripe from 'stripe';

interface CartItem {
  productId: string;
  quantity: number;
}

interface CreateOrderDto {
  cartItems: CartItem[];
  userId: string;
}

interface OrderPaymentResult {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  items: any[];
  orderId: string;
}

interface CartItemDetails {
  productId: string;
  quantity: number;
  price: number;
  title: string;
  sellerId: string;
}

@Injectable()
export class MarketplacePaymentService {
  private readonly logger = new Logger(MarketplacePaymentService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private transactionService: TransactionService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create a payment intent for marketplace order
   */
  async createOrderPayment(dto: CreateOrderDto): Promise<OrderPaymentResult> {
    const { cartItems, userId } = dto;

    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Get buyer
    const buyer = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!buyer) {
      throw new NotFoundException('User not found');
    }

    // Validate and fetch products with their sellers
    const itemDetails: CartItemDetails[] = [];
    let totalAmount = 0;

    for (const cartItem of cartItems) {
      const product = await this.prisma.marketplaceProduct.findUnique({
        where: { id: cartItem.productId },
        include: {
          seller: { include: { user: true } },
        },
      });

      if (!product) {
        throw new NotFoundException(`Product ${cartItem.productId} not found`);
      }

      if (!product.isAvailable) {
        throw new BadRequestException(`Product ${product.title} is not available`);
      }

      if (product.stock < cartItem.quantity) {
        throw new BadRequestException(
          `Not enough stock for ${product.title}. Available: ${product.stock}`,
        );
      }

      const itemTotal = Math.round(product.price * cartItem.quantity * 100); // cents
      totalAmount += itemTotal;

      itemDetails.push({
        productId: product.id,
        quantity: cartItem.quantity,
        price: product.price,
        title: product.title,
        sellerId: product.sellerId,
      });
    }

    // Create order record in PENDING state
    const order = await this.prisma.marketplaceOrder.create({
      data: {
        userId,
        totalAmount,
        status: 'pending',
        items: {
          create: itemDetails.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: { include: { seller: true } },
          },
        },
      },
    });

    // Create Stripe payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      metadata: {
        type: 'marketplace_order',
        orderId: order.id,
        buyerId: buyer.id,
        itemCount: itemDetails.length,
      },
      description: `Marketplace order ${order.id}: ${itemDetails.length} item(s)`,
    });

    this.logger.log(
      `Created payment intent ${paymentIntent.id} for marketplace order ${order.id}`,
    );

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: totalAmount,
      currency: 'usd',
      orderId: order.id,
      items: itemDetails.map((item) => ({
        productId: item.productId,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
      })),
    };
  }

  /**
   * Handle successful payment from Stripe webhook
   */
  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const { orderId, buyerId } = paymentIntent.metadata as any;

    this.logger.log(
      `Processing successful marketplace order payment ${paymentIntent.id} for order ${orderId}`,
    );

    // Get order with items and sellers
    const order = await this.prisma.marketplaceOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { include: { seller: { include: { user: true } } } },
          },
        },
        user: { include: { wallet: true } },
      },
    });

    if (!order) {
      this.logger.error(`Order ${orderId} not found`);
      return;
    }

    const totalAmount = paymentIntent.amount_received;

    // Update order status to PAID
    await this.prisma.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        paymentIntentId: paymentIntent.id,
      },
    });

    // Process payment splits for each seller
    const sellerSplits: { [key: string]: number } = {};

    for (const orderItem of order.items) {
      const itemAmount = Math.round(orderItem.price * orderItem.quantity * 100); // cents
      const platformFee = Math.round(itemAmount * 0.15); // 15% platform fee
      const sellerAmount = itemAmount - platformFee;

      const sellerId = orderItem.product.sellerId;
      sellerSplits[sellerId] = (sellerSplits[sellerId] || 0) + sellerAmount;

      // Credit seller wallet
      await this.walletService.addToWallet(sellerId, sellerAmount);

      // Create transaction for seller
      await this.transactionService.createTransaction({
        walletId: orderItem.product.seller.user.wallet!.id,
        type: 'MARKETPLACE_SALE',
        amount: sellerAmount,
        fee: platformFee,
        netAmount: sellerAmount,
        description: `Sold: ${orderItem.product.title} (Order #${orderId.slice(0, 8)})`,
        referenceId: orderId,
        referenceType: 'MARKETPLACE_ORDER',
        stripePaymentIntentId: paymentIntent.id,
        status: 'COMPLETED',
      });

      // Reduce product stock
      await this.prisma.marketplaceProduct.update({
        where: { id: orderItem.productId },
        data: { stock: { decrement: orderItem.quantity } },
      });
    }

    // Create transaction for buyer
    await this.transactionService.createTransaction({
      walletId: order.user.wallet!.id,
      type: 'MARKETPLACE_PURCHASE',
      amount: -totalAmount,
      fee: Math.round(totalAmount * 0.15),
      netAmount: -Object.values(sellerSplits).reduce((a, b) => a + b, 0),
      description: `Purchased ${order.items.length} item(s) from marketplace`,
      referenceId: orderId,
      referenceType: 'MARKETPLACE_ORDER',
      stripePaymentIntentId: paymentIntent.id,
      status: 'COMPLETED',
    });

    this.logger.log(
      `Confirmed marketplace order ${orderId}: ${Object.keys(sellerSplits).length} seller(s) credited`,
    );
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const { orderId } = paymentIntent.metadata as any;

    if (!orderId) return;

    this.logger.error(`Marketplace order payment failed: ${orderId}`);

    // Update order status to FAILED
    await this.prisma.marketplaceOrder.update({
      where: { id: orderId },
      data: { status: 'failed' },
    });
  }

  /**
   * Cancel an order (before payment)
   */
  async cancelOrder(orderId: string, userId: string, reason: string) {
    const order = await this.prisma.marketplaceOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only buyer can cancel
    if (order.userId !== userId) {
      throw new BadRequestException('Not authorized to cancel this order');
    }

    if (order.status !== 'pending' && order.status !== 'failed') {
      throw new BadRequestException('Can only cancel pending or failed orders');
    }

    // If paid, process refund
    if (order.paymentIntentId) {
      try {
        await this.stripe.refunds.create({
          payment_intent: order.paymentIntentId,
          reason: 'requested_by_customer',
        });

        this.logger.log(`Refunded payment for order ${orderId}`);
      } catch (error) {
        this.logger.error(`Failed to refund order ${orderId}: ${error.message}`);
      }
    }

    // Update order status
    await this.prisma.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    this.logger.log(`Cancelled order ${orderId}: ${reason}`);
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId: string) {
    return this.prisma.marketplaceOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { include: { seller: true } },
          },
        },
        user: true,
      },
    });
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId: string, limit = 50) {
    return this.prisma.marketplaceOrder.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: { seller: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get seller's sales
   */
  async getSellerSales(sellerId: string, limit = 50) {
    return this.prisma.marketplaceOrder.findMany({
      where: {
        items: {
          some: {
            product: { sellerId },
          },
        },
        status: 'paid',
      },
      include: {
        items: {
          where: {
            product: { sellerId },
          },
          include: {
            product: true,
          },
        },
        user: true,
      },
      orderBy: { paidAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get seller sales analytics
   */
  async getSellerAnalytics(sellerId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.marketplaceOrder.findMany({
      where: {
        items: {
          some: {
            product: { sellerId },
          },
        },
        status: 'paid',
        paidAt: { gte: startDate },
      },
      include: {
        items: {
          where: {
            product: { sellerId },
          },
          include: {
            product: true,
          },
        },
      },
    });

    const totalRevenue = orders.reduce((sum, order) => {
      const sellerItems = order.items.reduce((itemSum, item) => {
        return itemSum + Math.round(item.price * item.quantity * 100) * 0.85;
      }, 0);
      return sum + sellerItems;
    }, 0);

    const totalOrders = orders.length;
    const totalItemsSold = orders.reduce(
      (sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0),
      0,
    );

    return {
      totalRevenue,
      totalOrders,
      totalItemsSold,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders / 100 : 0,
      period: `${days} days`,
      topProducts: this.getTopProducts(orders),
    };
  }

  /**
   * Get top performing products
   */
  private getTopProducts(
    orders: any[],
  ): Array<{ productId: string; title: string; sold: number; revenue: number }> {
    const productMap: {
      [key: string]: { title: string; sold: number; revenue: number };
    } = {};

    for (const order of orders) {
      for (const item of order.items) {
        const key = item.productId;
        if (!productMap[key]) {
          productMap[key] = {
            title: item.product.title,
            sold: 0,
            revenue: 0,
          };
        }
        productMap[key].sold += item.quantity;
        productMap[key].revenue += Math.round(item.price * item.quantity * 100) * 0.85;
      }
    }

    return Object.entries(productMap)
      .map(([productId, data]) => ({
        productId,
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }
}
