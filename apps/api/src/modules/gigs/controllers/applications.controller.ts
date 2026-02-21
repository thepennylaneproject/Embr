import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApplicationsService } from '../services/applications.service';
import { 
  CreateApplicationDto,
  UpdateApplicationStatusDto,
} from '../dto/gig.dto';
import { 
  Application, 
  PaginatedApplications,
  ApplicationWithDetails,
} from '../../../shared/types/gig.types';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  /**
   * POST /applications
   * Submit a new application to a gig
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req,
    @Body() createApplicationDto: CreateApplicationDto
  ): Promise<Application> {
    return await this.applicationsService.create(req.user.id, createApplicationDto);
  }

  /**
   * GET /applications/my-applications
   * Get all applications submitted by the current user
   */
  @Get('my-applications')
  async getMyApplications(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<PaginatedApplications> {
    return await this.applicationsService.findByApplicant(req.user.id, page, limit);
  }

  /**
   * GET /applications/gig/:gigId
   * Get all applications for a specific gig (creator only)
   */
  @Get('gig/:gigId')
  async getGigApplications(
    @Request() req,
    @Param('gigId') gigId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ): Promise<PaginatedApplications> {
    return await this.applicationsService.findByGig(gigId, req.user.id, page, limit);
  }

  /**
   * GET /applications/stats
   * Get application statistics for the current user
   */
  @Get('stats')
  async getStats(@Request() req) {
    return await this.applicationsService.getApplicantStats(req.user.id);
  }

  /**
   * GET /applications/:id
   * Get a specific application with full details
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApplicationWithDetails> {
    return await this.applicationsService.findOne(id);
  }

  /**
   * POST /applications/:id/accept
   * Accept an application (gig creator only)
   */
  @Post(':id/accept')
  async accept(
    @Request() req,
    @Param('id') id: string
  ): Promise<Application> {
    return await this.applicationsService.accept(id, req.user.id);
  }

  /**
   * POST /applications/:id/reject
   * Reject an application (gig creator only)
   */
  @Post(':id/reject')
  async reject(
    @Request() req,
    @Param('id') id: string
  ): Promise<Application> {
    return await this.applicationsService.reject(id, req.user.id);
  }

  /**
   * POST /applications/:id/withdraw
   * Withdraw an application (applicant only)
   */
  @Post(':id/withdraw')
  async withdraw(
    @Request() req,
    @Param('id') id: string
  ): Promise<Application> {
    return await this.applicationsService.withdraw(id, req.user.id);
  }
}
