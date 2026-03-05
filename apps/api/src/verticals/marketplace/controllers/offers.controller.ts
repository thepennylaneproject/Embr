import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { OffersService } from '../services/offers.service';
import { CreateOfferDto } from '../dto/marketplace.dto';

@Controller('marketplace/listings/:listingId/offers')
@UseGuards(JwtAuthGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOffer(
    @Param('listingId') listingId: string,
    @Request() req,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.createOffer(listingId, req.user.id, dto);
  }

  @Get()
  async getOffers(@Param('listingId') listingId: string, @Request() req) {
    return this.offersService.getListingOffers(listingId, req.user.id);
  }

  @Put(':offerId/accept')
  @HttpCode(HttpStatus.OK)
  async acceptOffer(@Param('offerId') offerId: string, @Request() req) {
    return this.offersService.acceptOffer(offerId, req.user.id);
  }

  @Put(':offerId/decline')
  @HttpCode(HttpStatus.OK)
  async declineOffer(@Param('offerId') offerId: string, @Request() req) {
    return this.offersService.declineOffer(offerId, req.user.id);
  }

  @Put(':offerId/withdraw')
  @HttpCode(HttpStatus.OK)
  async withdrawOffer(@Param('offerId') offerId: string, @Request() req) {
    return this.offersService.withdrawOffer(offerId, req.user.id);
  }
}
