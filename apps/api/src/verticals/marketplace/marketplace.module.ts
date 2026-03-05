import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../core/notifications/notifications.module';
import { ListingsController } from './controllers/listings.controller';
import { OrdersController } from './controllers/orders.controller';
import { MarketplaceReviewsController } from './controllers/marketplace-reviews.controller';
import { OffersController } from './controllers/offers.controller';
import { ListingsService } from './services/listings.service';
import { OrdersService } from './services/orders.service';
import { MarketplaceReviewsService } from './services/marketplace-reviews.service';
import { OffersService } from './services/offers.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ListingsController, OrdersController, MarketplaceReviewsController, OffersController],
  providers: [ListingsService, OrdersService, MarketplaceReviewsService, OffersService],
  exports: [ListingsService],
})
export class MarketplaceModule {}
