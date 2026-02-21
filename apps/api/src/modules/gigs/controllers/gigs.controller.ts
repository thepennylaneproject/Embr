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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GigsService } from '../services/gigs.service';
import { 
  CreateGigDto, 
  UpdateGigDto, 
  GigSearchDto 
} from '../dto/gig.dto';
import { Gig, PaginatedGigs, GigWithDetails, GigStats } from '../../../shared/types/gig.types';

@Controller('gigs')
@UseGuards(JwtAuthGuard)
export class GigsController {
  constructor(private readonly gigsService: GigsService) {}

  /**
   * POST /gigs
   * Create a new gig posting
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req,
    @Body() createGigDto: CreateGigDto
  ): Promise<Gig> {
    return await this.gigsService.create(req.user.id, createGigDto);
  }

  /**
   * POST /gigs/:id/publish
   * Publish a draft gig to make it visible
   */
  @Post(':id/publish')
  async publish(
    @Request() req,
    @Param('id') id: string
  ): Promise<Gig> {
    return await this.gigsService.publish(id, req.user.id);
  }

  /**
   * GET /gigs
   * Search and filter gigs
   */
  @Get()
  async findAll(@Query() searchDto: GigSearchDto): Promise<PaginatedGigs> {
    return await this.gigsService.findAll(searchDto);
  }

  /**
   * GET /gigs/my-gigs
   * Get all gigs created by the current user
   */
  @Get('my-gigs')
  async getMyGigs(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<PaginatedGigs> {
    return await this.gigsService.findByCreator(req.user.id, page, limit);
  }

  /**
   * GET /gigs/recommended
   * Get recommended gigs for the current user
   */
  @Get('recommended')
  async getRecommended(
    @Request() req,
    @Query('limit') limit?: number
  ): Promise<Gig[]> {
    return await this.gigsService.getRecommendedGigs(req.user.id, limit);
  }

  /**
   * GET /gigs/stats
   * Get statistics for the current user's gigs
   */
  @Get('stats')
  async getStats(@Request() req): Promise<GigStats> {
    return await this.gigsService.getCreatorStats(req.user.id);
  }

  /**
   * GET /gigs/:id
   * Get a specific gig with full details
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<GigWithDetails> {
    // Increment view count (fire and forget)
    this.gigsService.incrementViews(id).catch(() => {});
    return await this.gigsService.findOne(id);
  }

  /**
   * GET /gigs/creator/:creatorId
   * Get all gigs by a specific creator
   */
  @Get('creator/:creatorId')
  async findByCreator(
    @Param('creatorId') creatorId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<PaginatedGigs> {
    return await this.gigsService.findByCreator(creatorId, page, limit);
  }

  /**
   * PUT /gigs/:id
   * Update a gig
   */
  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateGigDto: UpdateGigDto
  ): Promise<Gig> {
    return await this.gigsService.update(id, req.user.id, updateGigDto);
  }

  /**
   * POST /gigs/:id/cancel
   * Cancel a gig
   */
  @Post(':id/cancel')
  async cancel(
    @Request() req,
    @Param('id') id: string
  ): Promise<Gig> {
    return await this.gigsService.cancel(id, req.user.id);
  }

  /**
   * POST /gigs/:id/complete
   * Mark a gig as completed
   */
  @Post(':id/complete')
  async complete(
    @Request() req,
    @Param('id') id: string
  ): Promise<Gig> {
    return await this.gigsService.markCompleted(id, req.user.id);
  }

  /**
   * DELETE /gigs/:id
   * Soft delete a gig
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Request() req,
    @Param('id') id: string
  ): Promise<void> {
    return await this.gigsService.remove(id, req.user.id);
  }
}
