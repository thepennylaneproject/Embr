import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateApplicationDto,
} from '../dto/gig.dto';
import {
  ApplicationStatus,
  GigStatus,
  PaginatedApplications,
  ApplicationWithDetails,
  MilestoneProposal,
} from '../../../shared/types/gig.types';
import { GigsService } from './gigs.service';
import { EscrowService } from './escrow.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private gigsService: GigsService,
    private escrowService: EscrowService,
  ) {}

  /**
   * Create a new application for a gig
   */
  async create(applicantId: string, createApplicationDto: CreateApplicationDto) {
    const { gigId, milestones, ...applicationData } = createApplicationDto;

    const gig = await this.gigsService.findOne(gigId);

    if (gig.status !== GigStatus.OPEN) {
      throw new BadRequestException('This gig is not accepting applications');
    }

    if (gig.creatorId === applicantId) {
      throw new BadRequestException('Cannot apply to your own gig');
    }

    const existingApplication = await this.prisma.application.findUnique({
      where: { gigId_applicantId: { gigId, applicantId } },
    });

    if (existingApplication) {
      throw new BadRequestException('You have already applied to this gig');
    }

    if (milestones && milestones.length > 0) {
      const totalMilestoneAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
      if (Math.abs(totalMilestoneAmount - applicationData.proposedBudget) > 0.01) {
        throw new BadRequestException('Milestone amounts must sum to proposed budget');
      }
    }

    const application = await this.prisma.application.create({
      data: {
        ...applicationData,
        gigId,
        applicantId,
        status: ApplicationStatus.PENDING,
        milestoneProposals: (milestones ? milestones : undefined) as any,
      },
    });

    await this.gigsService.incrementApplications(gigId);

    return {
      ...application,
      milestoneProposals: application.milestoneProposals as unknown as MilestoneProposal[],
    };
  }

  /**
   * Find all applications for a gig (for gig creator)
   */
  async findByGig(gigId: string, creatorId: string, page = 1, limit = 20): Promise<PaginatedApplications> {
    const gig = await this.gigsService.findOne(gigId);
    if (gig.creatorId !== creatorId) {
      throw new ForbiddenException('You can only view applications for your own gigs');
    }

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where: { gigId },
        include: {
          applicant: { include: { profile: true } },
          gig: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.application.count({ where: { gigId } }),
    ]);

    return {
      applications: applications.map(app => ({
        ...app,
        milestoneProposals: app.milestoneProposals as unknown as MilestoneProposal[],
      })) as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find all applications submitted by a user
   */
  async findByApplicant(applicantId: string, page = 1, limit = 20): Promise<PaginatedApplications> {
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where: { applicantId },
        include: {
          applicant: { include: { profile: true } },
          gig: { include: { creator: { include: { profile: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.application.count({ where: { applicantId } }),
    ]);

    return {
      applications: applications.map(app => ({
        ...app,
        milestoneProposals: app.milestoneProposals as unknown as MilestoneProposal[],
      })) as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find one application with full details
   */
  async findOne(id: string): Promise<ApplicationWithDetails> {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        applicant: { include: { profile: true } },
        gig: { include: { creator: { include: { profile: true } } } },
        escrow: true,
        milestones: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return {
      ...application,
      milestoneProposals: application.milestoneProposals as unknown as MilestoneProposal[],
    } as unknown as ApplicationWithDetails;
  }

  /**
   * Accept an application (gig creator action)
   */
  async accept(id: string, creatorId: string) {
    const application = await this.findOne(id);
    const gig = application.gig;

    if (gig.creatorId !== creatorId) {
      throw new ForbiddenException('Only the gig creator can accept applications');
    }

    if (gig.status !== GigStatus.OPEN) {
      throw new BadRequestException('This gig is not accepting applications');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Only pending applications can be accepted');
    }

    await this.prisma.application.updateMany({
      where: { gigId: gig.id, status: ApplicationStatus.PENDING },
      data: { status: ApplicationStatus.REJECTED },
    });

    const savedApplication = await this.prisma.application.update({
      where: { id: application.id },
      data: { status: ApplicationStatus.ACCEPTED },
    });

    await this.gigsService.markInProgress(gig.id);

    const proposals = (application as any).milestoneProposals as MilestoneProposal[] | undefined;

    if (proposals && proposals.length > 0) {
      await this.escrowService.create({
        gigId: gig.id,
        applicationId: application.id,
        payerId: gig.creatorId,
        payeeId: application.applicantId,
        amount: application.proposedBudget,
      });

      for (let i = 0; i < proposals.length; i++) {
        const proposal = proposals[i];
        await this.prisma.gigMilestone.create({
          data: {
            gigId: gig.id,
            applicationId: application.id,
            title: proposal.title,
            description: proposal.description,
            amount: proposal.amount,
            dueDate: new Date(Date.now() + proposal.estimatedDays * 24 * 60 * 60 * 1000),
            order: i,
            status: 'PENDING',
          },
        });
      }
    }

    return {
      ...savedApplication,
      milestoneProposals: savedApplication.milestoneProposals as unknown as MilestoneProposal[],
    };
  }

  /**
   * Reject an application (gig creator action)
   */
  async reject(id: string, creatorId: string) {
    const application = await this.findOne(id);
    const gig = application.gig;

    if (gig.creatorId !== creatorId) {
      throw new ForbiddenException('Only the gig creator can reject applications');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Only pending applications can be rejected');
    }

    const updatedApp = await this.prisma.application.update({
      where: { id: application.id },
      data: { status: ApplicationStatus.REJECTED },
    });

    return {
      ...updatedApp,
      milestoneProposals: updatedApp.milestoneProposals as unknown as MilestoneProposal[],
    };
  }

  /**
   * Withdraw an application (applicant action)
   */
  async withdraw(id: string, applicantId: string) {
    const application = await this.findOne(id);

    if (application.applicantId !== applicantId) {
      throw new ForbiddenException('You can only withdraw your own applications');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Only pending applications can be withdrawn');
    }

    const updatedApp = await this.prisma.application.update({
      where: { id: application.id },
      data: { status: ApplicationStatus.WITHDRAWN },
    });

    return {
      ...updatedApp,
      milestoneProposals: updatedApp.milestoneProposals as unknown as MilestoneProposal[],
    };
  }

  /**
   * Update application status (internal use)
   */
  async updateStatus(id: string, status: ApplicationStatus) {
    return await this.prisma.application.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Get application statistics for a user
   */
  async getApplicantStats(applicantId: string) {
    const applications = await this.prisma.application.findMany({
      where: { applicantId },
    });

    return {
      totalApplications: applications.length,
      pending: applications.filter(a => a.status === ApplicationStatus.PENDING).length,
      accepted: applications.filter(a => a.status === ApplicationStatus.ACCEPTED).length,
      rejected: applications.filter(a => a.status === ApplicationStatus.REJECTED).length,
      withdrawn: applications.filter(a => a.status === ApplicationStatus.WITHDRAWN).length,
    };
  }
}
