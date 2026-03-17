import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  CreateApplicationDto,
} from '../dto/gig.dto';
import {
  ApplicationStatus,
  GigStatus,
  PaginatedApplications,
  ApplicationWithDetails,
  MilestoneProposal,
} from '@embr/types';
import { GigsService } from './gigs.service';

/**
 * Prisma select shape for user + profile data that is safe to return publicly.
 * Mirrors the constant in gigs.service.ts to avoid cross-service import cycles.
 */
const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  isVerified: true,
  role: true,
  createdAt: true,
  profile: {
    select: {
      displayName: true,
      avatarUrl: true,
      bannerUrl: true,
      bio: true,
      location: true,
      website: true,
      socialLinks: true,
      availability: true,
      skills: true,
      categories: true,
      isCreator: true,
      isPrivate: true,
      isVerified: true,
      allowTips: true,
      followerCount: true,
      followingCount: true,
      postCount: true,
    },
  },
} as const;

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private gigsService: GigsService,
    private eventEmitter: EventEmitter2,
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

    // Validate proposed budget is within gig's budget range
    if (applicationData.proposedBudget < gig.budgetMin || applicationData.proposedBudget > gig.budgetMax) {
      throw new BadRequestException(
        `Proposed budget must be between $${gig.budgetMin} and $${gig.budgetMax}`
      );
    }

    // Prevent application spam: max 5 applications per hour per applicant
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentApplicationCount = await this.prisma.application.count({
      where: {
        applicantId,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentApplicationCount >= 5) {
      throw new BadRequestException(
        'Too many applications in a short time. Please wait before applying to more gigs.'
      );
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

    // Emit event for notification creation
    this.eventEmitter.emit('gig.application.created', {
      applicationId: application.id,
      gigId,
      applicantId,
      gigCreatorId: gig.creatorId,
    });

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
          applicant: { select: PUBLIC_USER_SELECT },
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
          applicant: { select: PUBLIC_USER_SELECT },
          gig: { include: { creator: { select: PUBLIC_USER_SELECT } } },
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
   * @param id Application ID
   * @param userId Optional user ID for authorization check
   * @throws ForbiddenException if user is not the applicant or gig creator
   */
  async findOne(id: string, userId?: string): Promise<ApplicationWithDetails> {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        applicant: { select: PUBLIC_USER_SELECT },
        gig: { include: { creator: { select: PUBLIC_USER_SELECT } } },
        escrow: true,
        milestones: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Authorization check: only applicant, gig creator, or admin can view
    if (userId && application.applicantId !== userId && application.gig.creatorId !== userId) {
      throw new ForbiddenException('You cannot view this application');
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

    // Ensure only the gig creator can accept applications
    if (gig.creatorId !== creatorId) {
      throw new ForbiddenException('Only the gig creator can accept applications');
    }

    if (gig.status !== GigStatus.OPEN) {
      throw new BadRequestException('This gig is not accepting applications');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Only pending applications can be accepted');
    }

    const proposals =
      (application as any).milestoneProposals as MilestoneProposal[] | undefined;

    const { savedApplication, rejectedApplicants } = await this.prisma.$transaction(
      async (tx) => {
        // Compare-and-set the gig status to prevent concurrent acceptance races.
        const gigUpdate = await tx.gig.updateMany({
          where: { id: gig.id, status: GigStatus.OPEN as any },
          data: { status: GigStatus.IN_PROGRESS as any },
        });
        if (gigUpdate.count !== 1) {
          throw new BadRequestException('This gig is no longer accepting applications');
        }

        // Compare-and-set target application.
        const acceptedUpdate = await tx.application.updateMany({
          where: {
            id: application.id,
            gigId: gig.id,
            status: ApplicationStatus.PENDING as any,
          },
          data: { status: ApplicationStatus.ACCEPTED as any },
        });
        if (acceptedUpdate.count !== 1) {
          throw new BadRequestException('Only pending applications can be accepted');
        }

        const rejectedApps = await tx.application.findMany({
          where: {
            gigId: gig.id,
            status: ApplicationStatus.PENDING as any,
            id: { not: application.id },
          },
          select: { id: true, applicantId: true },
        });

        if (rejectedApps.length > 0) {
          await tx.application.updateMany({
            where: {
              gigId: gig.id,
              status: ApplicationStatus.PENDING as any,
              id: { not: application.id },
            },
            data: { status: ApplicationStatus.REJECTED as any },
          });
        }

        if (proposals && proposals.length > 0) {
          await tx.escrow.create({
            data: {
              gigId: gig.id,
              applicationId: application.id,
              payerId: gig.creatorId,
              payeeId: application.applicantId,
              amount: application.proposedBudget,
            },
          });

          await tx.gigMilestone.createMany({
            data: proposals.map((proposal, index) => ({
              gigId: gig.id,
              applicationId: application.id,
              title: proposal.title,
              description: proposal.description,
              amount: proposal.amount,
              dueDate: new Date(
                Date.now() + proposal.estimatedDays * 24 * 60 * 60 * 1000,
              ),
              order: index,
              status: 'PENDING',
            })),
          });
        }

        const updatedAccepted = await tx.application.findUniqueOrThrow({
          where: { id: application.id },
        });

        return {
          savedApplication: updatedAccepted,
          rejectedApplicants: rejectedApps,
        };
      },
      { isolationLevel: 'Serializable' },
    );

    this.eventEmitter.emit('gig.application.accepted', {
      applicationId: application.id,
      gigId: gig.id,
      applicantId: application.applicantId,
    });

    for (const rejectedApp of rejectedApplicants) {
      this.eventEmitter.emit('gig.application.rejected', {
        applicationId: rejectedApp.id,
        gigId: gig.id,
        applicantId: rejectedApp.applicantId,
      });
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

    // Emit event for notification creation
    this.eventEmitter.emit('gig.application.rejected', {
      applicationId: application.id,
      gigId: gig.id,
      applicantId: application.applicantId,
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
