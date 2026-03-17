import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { OrdersService } from '../services/orders.service';
import { CreateCheckoutDto, CreateOrderDto } from '../dto/marketplace.dto';

@Controller('marketplace/orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Request() req, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.id, dto);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@Request() req, @Body() dto: CreateCheckoutDto) {
    return this.ordersService.checkout(req.user.id, dto);
  }

  @Get('buying')
  async getMyPurchases(@Request() req, @Query('status') status?: string) {
    return this.ordersService.getBuyerOrders(req.user.id, status);
  }

  @Get('selling')
  async getMySales(@Request() req, @Query('status') status?: string) {
    return this.ordersService.getSellerOrders(req.user.id, status);
  }

  @Put(':id/pay')
  async confirmPayment(@Param('id') id: string, @Request() req) {
    return this.ordersService.confirmPayment(id, req.user.id);
  }

  @Put(':id/ship')
  async markShipped(
    @Param('id') id: string,
    @Request() req,
    @Body('trackingNumber') trackingNumber: string,
  ) {
    return this.ordersService.markShipped(id, req.user.id, trackingNumber);
  }

  @Put(':id/deliver')
  async markDelivered(@Param('id') id: string, @Request() req) {
    return this.ordersService.markDelivered(id, req.user.id);
  }

  @Put(':id/complete')
  async complete(@Param('id') id: string, @Request() req) {
    return this.ordersService.complete(id, req.user.id);
  }
}
