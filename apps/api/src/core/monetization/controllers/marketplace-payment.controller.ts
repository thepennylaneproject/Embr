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
import { MarketplacePaymentService } from '../services/marketplace-payment.service';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';

@Controller('api/marketplace/orders')
@UseGuards(JwtAuthGuard)
export class MarketplacePaymentController {
  private readonly logger = new Logger(MarketplacePaymentController.name);

  constructor(
    private marketplacePaymentService: MarketplacePaymentService,
  ) {}

  /**
   * POST /api/marketplace/orders/checkout
   * Create a payment intent for marketplace order
   */
  @Post('checkout')
  async createOrderPayment(
    @Body('cartItems') cartItems: Array<{ productId: string; quantity: number }>,
    @Request() req: any,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      return { error: 'Not authenticated' };
    }

    if (!cartItems || !Array.isArray(cartItems)) {
      return { error: 'cartItems must be an array' };
    }

    try {
      const result = await this.marketplacePaymentService.createOrderPayment({
        cartItems,
        userId,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create marketplace order: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to create order',
      };
    }
  }

  /**
   * GET /api/marketplace/orders/:orderId
   * Get order details
   */
  @Get(':orderId')
  async getOrder(
    @Param('orderId') orderId: string,
    @Request() req: any,
  ) {
    try {
      const order = await this.marketplacePaymentService.getOrderDetails(orderId);

      if (!order) {
        return { error: 'Order not found' };
      }

      // Verify authorization (buyer only)
      if (req.user?.id !== order.userId) {
        return { error: 'Unauthorized' };
      }

      return {
        success: true,
        data: order,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get order: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to fetch order',
      };
    }
  }

  /**
   * GET /api/marketplace/orders/user/my-orders
   * Get current user's orders
   */
  @Get('user/my-orders')
  async getUserOrders(@Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return { error: 'Not authenticated' };
      }

      const orders = await this.marketplacePaymentService.getUserOrders(userId);

      return {
        success: true,
        data: orders,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get user orders: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to fetch orders',
      };
    }
  }

  /**
   * GET /api/marketplace/orders/seller/my-sales
   * Get seller's sales
   */
  @Get('seller/my-sales')
  async getSellerSales(@Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return { error: 'Not authenticated' };
      }

      // Get seller record for this user
      const seller = await (global as any).prisma.marketplaceSeller.findFirst({
        where: { userId },
      });

      if (!seller) {
        return { error: 'Seller account not found' };
      }

      const sales = await this.marketplacePaymentService.getSellerSales(seller.id);

      return {
        success: true,
        data: sales,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get seller sales: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to fetch sales',
      };
    }
  }

  /**
   * GET /api/marketplace/orders/seller/analytics
   * Get seller analytics
   */
  @Get('seller/analytics')
  async getSellerAnalytics(@Request() req: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return { error: 'Not authenticated' };
      }

      // Get seller record for this user
      const seller = await (global as any).prisma.marketplaceSeller.findFirst({
        where: { userId },
      });

      if (!seller) {
        return { error: 'Seller account not found' };
      }

      const analytics = await this.marketplacePaymentService.getSellerAnalytics(seller.id);

      return {
        success: true,
        data: analytics,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get seller analytics: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to fetch analytics',
      };
    }
  }

  /**
   * POST /api/marketplace/orders/:orderId/cancel
   * Cancel an order
   */
  @Post(':orderId/cancel')
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    try {
      const order = await this.marketplacePaymentService.getOrderDetails(orderId);

      if (!order) {
        return { error: 'Order not found' };
      }

      // Only buyer can cancel
      if (req.user?.id !== order.userId) {
        return { error: 'Unauthorized' };
      }

      await this.marketplacePaymentService.cancelOrder(
        orderId,
        req.user.id,
        reason || 'User cancelled',
      );

      return {
        success: true,
        message: 'Order cancelled',
      };
    } catch (error: any) {
      this.logger.error(`Failed to cancel order: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to cancel order',
      };
    }
  }
}
