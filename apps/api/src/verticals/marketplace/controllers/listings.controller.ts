import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { ListingsService } from '../services/listings.service';
import { CreateListingDto, UpdateListingDto, ListingSearchDto } from '../dto/marketplace.dto';

@Controller('marketplace/listings')
@UseGuards(JwtAuthGuard)
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req, @Body() dto: CreateListingDto) {
    return this.listingsService.create(req.user.id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id') id: string, @Request() req) {
    return this.listingsService.publish(id, req.user.id);
  }

  @Get()
  @Public()
  async findAll(@Query() searchDto: ListingSearchDto) {
    return this.listingsService.findAll(searchDto);
  }

  @Get('mine')
  async getMyListings(@Request() req, @Query('status') status?: string) {
    return this.listingsService.getSellerListings(req.user.id, status);
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateListingDto) {
    return this.listingsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.listingsService.delete(id, req.user.id);
  }
}
