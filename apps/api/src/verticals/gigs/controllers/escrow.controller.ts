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
import { EscrowService } from '../services/escrow.service';
import { 
  FundEscrowDto,
  ReleaseMilestoneDto,
  UpdateMilestoneDto,
} from '../dto/gig.dto';
import { 
  Escrow,
  GigMilestone,
} from '../../../shared/types/gig.types';

@Controller('escrow')
@UseGuards(JwtAuthGuard)
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  /**
   * GET /escrow/application/:applicationId
   * Get escrow details for an application
   * Authorization: Only the payer or payee can view
   */
  @Get('application/:applicationId')
  async getByApplication(
    @Param('applicationId') applicationId: string,
    @Request() req
  ): Promise<Escrow | null> {
    return await this.escrowService.findByApplication(applicationId, req.user.id);
  }

  /**
   * GET /escrow/:id
   * Get escrow details
   * Authorization: Only the payer or payee can view
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() req
  ): Promise<Escrow> {
    return await this.escrowService.findOne(id, req.user.id);
  }

  /**
   * POST /escrow/:id/fund
   * Fund an escrow account with Stripe payment
   */
  @Post(':id/fund')
  async fund(
    @Request() req,
    @Param('id') id: string,
    @Body() fundEscrowDto: FundEscrowDto
  ): Promise<Escrow> {
    return await this.escrowService.fund(id, req.user.id, fundEscrowDto);
  }

  /**
   * POST /escrow/:id/release-milestone
   * Release payment for a specific milestone
   */
  @Post(':id/release-milestone')
  async releaseMilestone(
    @Request() req,
    @Param('id') id: string,
    @Body() releaseMilestoneDto: ReleaseMilestoneDto
  ): Promise<{ escrow: Escrow; milestone: GigMilestone }> {
    return await this.escrowService.releaseMilestone(id, req.user.id, releaseMilestoneDto);
  }

  /**
   * GET /escrow/:id/released-amount
   * Get total amount released from escrow
   * Authorization: Only the payer or payee can view
   */
  @Get(':id/released-amount')
  async getReleasedAmount(
    @Param('id') id: string,
    @Request() req
  ): Promise<{ amount: number }> {
    // Check authorization by fetching escrow
    await this.escrowService.findOne(id, req.user.id);
    const amount = await this.escrowService.getReleasedAmount(id);
    return { amount };
  }
}

@Controller('milestones')
@UseGuards(JwtAuthGuard)
export class MilestonesController {
  constructor(private readonly escrowService: EscrowService) {}

  /**
   * GET /milestones/application/:applicationId
   * Get all milestones for an application
   * Authorization: Only the applicant or gig creator can view
   */
  @Get('application/:applicationId')
  async getMilestones(
    @Param('applicationId') applicationId: string,
    @Request() req
  ): Promise<GigMilestone[]> {
    return await this.escrowService.getMilestones(applicationId, req.user.id);
  }

  /**
   * POST /milestones/:id/submit
   * Submit a milestone for review (freelancer action)
   */
  @Post(':id/submit')
  async submit(
    @Request() req,
    @Param('id') id: string
  ): Promise<GigMilestone> {
    return await this.escrowService.submitMilestone(id, req.user.id);
  }

  /**
   * POST /milestones/:id/approve
   * Approve a milestone (client action)
   */
  @Post(':id/approve')
  async approve(
    @Request() req,
    @Param('id') id: string,
    @Body('feedback') feedback?: string
  ): Promise<GigMilestone> {
    return await this.escrowService.approveMilestone(id, req.user.id, feedback);
  }

  /**
   * POST /milestones/:id/reject
   * Reject a milestone (client action)
   */
  @Post(':id/reject')
  async reject(
    @Request() req,
    @Param('id') id: string,
    @Body('feedback') feedback: string
  ): Promise<GigMilestone> {
    return await this.escrowService.rejectMilestone(id, req.user.id, feedback);
  }
}
