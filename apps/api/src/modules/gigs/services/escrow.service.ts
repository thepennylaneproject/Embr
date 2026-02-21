import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FundEscrowDto,
  ReleaseMilestoneDto,
} from '../dto/gig.dto';
import {
  EscrowStatus,
  MilestoneStatus,
} from '../../../shared/types/gig.types';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface CreateEscrowParams {
  gigId: string;
  applicationId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency?: string;
}

@Injectable()
export class EscrowService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new escrow account for a gig
   */
  async create(params: CreateEscrowParams) {
    const { gigId, applicationId, payerId, payeeId, amount, currency = 'USD' } = params;

    const existingEscrow = await this.prisma.escrow.findUnique({
      where: { applicationId },
    });

    if (existingEscrow) {
      throw new BadRequestException('Escrow already exists for this application');
    }

    return await this.prisma.escrow.create({
      data: {
        gigId,
        applicationId,
        payerId,
        payeeId,
        amount,
        currency,
        status: EscrowStatus.CREATED,
      },
    });
  }

  /**
   * Fund the escrow using Stripe PaymentIntent
   */
  async fund(escrowId: string, payerId: string, fundEscrowDto: FundEscrowDto) {
    const escrow = await this.findOne(escrowId);

    if (escrow.payerId !== payerId) {
      throw new ForbiddenException('Only the payer can fund this escrow');
    }

    if (escrow.status !== EscrowStatus.CREATED) {
      throw new BadRequestException('Escrow has already been funded or is in an invalid state');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(escrow.amount * 100),
        currency: escrow.currency.toLowerCase(),
        payment_method: fundEscrowDto.stripePaymentMethodId,
        confirm: true,
        capture_method: 'manual',
        metadata: {
          escrowId: escrow.id,
          gigId: escrow.gigId,
          applicationId: escrow.applicationId,
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      if (paymentIntent.status === 'requires_capture') {
        return await this.prisma.escrow.update({
          where: { id: escrow.id },
          data: {
            status: EscrowStatus.FUNDED,
            stripePaymentIntentId: paymentIntent.id,
            stripeFundingMethod: fundEscrowDto.stripePaymentMethodId,
            fundedAt: new Date(),
          },
        });
      }

      throw new BadRequestException(`Payment failed with status: ${paymentIntent.status}`);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Release payment for a specific milestone
   */
  async releaseMilestone(
    escrowId: string,
    payerId: string,
    releaseMilestoneDto: ReleaseMilestoneDto,
  ): Promise<{ escrow: any; milestone: any }> {
    const escrow = await this.findOne(escrowId);
    const milestone = await this.prisma.gigMilestone.findUnique({
      where: { id: releaseMilestoneDto.milestoneId },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (escrow.payerId !== payerId) {
      throw new ForbiddenException('Only the payer can release milestone payments');
    }

    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new BadRequestException('Escrow must be funded before releasing payments');
    }

    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      throw new BadRequestException('Milestone must be submitted before payment can be released');
    }

    try {
      const transferAmount = Math.round(milestone.amount * 100);

      await stripe.paymentIntents.capture(escrow.stripePaymentIntentId!, {
        amount_to_capture: transferAmount,
      });

      const updatedMilestone = await this.prisma.gigMilestone.update({
        where: { id: milestone.id },
        data: { status: MilestoneStatus.APPROVED, approvedAt: new Date() },
      });

      const allMilestones = await this.prisma.gigMilestone.findMany({
        where: { applicationId: escrow.applicationId },
      });

      const allApproved = allMilestones.every(m => m.status === MilestoneStatus.APPROVED);

      const updatedEscrow = await this.prisma.escrow.update({
        where: { id: escrow.id },
        data: allApproved
          ? { status: EscrowStatus.RELEASED, releasedAt: new Date() }
          : {},
      });

      return { escrow: updatedEscrow, milestone: updatedMilestone };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Refund the entire escrow (in case of cancellation or dispute resolution)
   */
  async refund(escrowId: string, _adminId: string, _reason: string) {
    const escrow = await this.findOne(escrowId);

    if (!([EscrowStatus.FUNDED, EscrowStatus.DISPUTED] as EscrowStatus[]).includes(escrow.status)) {
      throw new BadRequestException('Can only refund funded or disputed escrows');
    }

    try {
      await stripe.paymentIntents.cancel(escrow.stripePaymentIntentId!);

      return await this.prisma.escrow.update({
        where: { id: escrow.id },
        data: { status: EscrowStatus.REFUNDED, refundedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Mark escrow as disputed
   */
  async markDisputed(escrowId: string) {
    const escrow = await this.findOne(escrowId);

    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new BadRequestException('Only funded escrows can be disputed');
    }

    return await this.prisma.escrow.update({
      where: { id: escrow.id },
      data: { status: EscrowStatus.DISPUTED },
    });
  }

  /**
   * Get escrow details
   */
  async findOne(id: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id },
      include: {
        gig: true,
        application: true,
        payer: true,
        payee: true,
      },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    return escrow;
  }

  /**
   * Get escrow by application ID
   */
  async findByApplication(applicationId: string) {
    return await this.prisma.escrow.findUnique({
      where: { applicationId },
      include: {
        gig: true,
        application: true,
        payer: true,
        payee: true,
      },
    });
  }

  /**
   * Get all milestones for an application
   */
  async getMilestones(applicationId: string) {
    return await this.prisma.gigMilestone.findMany({
      where: { applicationId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Submit a milestone for review (freelancer action)
   */
  async submitMilestone(milestoneId: string, freelancerId: string) {
    const milestone = await this.prisma.gigMilestone.findUnique({
      where: { id: milestoneId },
      include: { application: true },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.application.applicantId !== freelancerId) {
      throw new ForbiddenException('Only the assigned freelancer can submit milestones');
    }

    if (!([MilestoneStatus.PENDING, MilestoneStatus.REJECTED] as MilestoneStatus[]).includes(milestone.status)) {
      throw new BadRequestException('Only pending or rejected milestones can be submitted');
    }

    return await this.prisma.gigMilestone.update({
      where: { id: milestone.id },
      data: { status: MilestoneStatus.SUBMITTED, submittedAt: new Date() },
    });
  }

  /**
   * Approve a milestone (client action)
   */
  async approveMilestone(milestoneId: string, clientId: string, feedback?: string) {
    const milestone = await this.prisma.gigMilestone.findUnique({
      where: { id: milestoneId },
      include: { gig: true },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.gig.creatorId !== clientId) {
      throw new ForbiddenException('Only the gig creator can approve milestones');
    }

    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted milestones can be approved');
    }

    return await this.prisma.gigMilestone.update({
      where: { id: milestone.id },
      data: { status: MilestoneStatus.APPROVED, approvedAt: new Date(), feedback },
    });
  }

  /**
   * Reject a milestone (client action)
   */
  async rejectMilestone(milestoneId: string, clientId: string, feedback: string) {
    const milestone = await this.prisma.gigMilestone.findUnique({
      where: { id: milestoneId },
      include: { gig: true },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.gig.creatorId !== clientId) {
      throw new ForbiddenException('Only the gig creator can reject milestones');
    }

    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted milestones can be rejected');
    }

    if (!feedback) {
      throw new BadRequestException('Feedback is required when rejecting a milestone');
    }

    return await this.prisma.gigMilestone.update({
      where: { id: milestone.id },
      data: { status: MilestoneStatus.REJECTED, rejectedAt: new Date(), feedback },
    });
  }

  /**
   * Calculate total amount released from escrow
   */
  async getReleasedAmount(escrowId: string): Promise<number> {
    const escrow = await this.findOne(escrowId);
    const milestones = await this.getMilestones(escrow.applicationId);

    return milestones
      .filter(m => m.status === MilestoneStatus.APPROVED)
      .reduce((sum, m) => sum + m.amount, 0);
  }
}
