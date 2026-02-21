import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateGigDto,
  UpdateGigDto,
  GigSearchDto,
} from '../dto/gig.dto';
import {
  GigStatus as PrismaGigStatus,
  GigBudgetType as PrismaGigBudgetType,
  GigExperienceLevel as PrismaGigExperienceLevel,
  GigCategory as PrismaGigCategory,
  Prisma,
} from '@prisma/client';
import {
  GigStatus,
  PaginatedGigs,
  GigWithDetails,
  GigStats,
  GigCategory,
  GigBudgetType,
  GigExperienceLevel,
} from '../../../shared/types/gig.types';

@Injectable()
export class GigsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new gig posting
   */
  async create(creatorId: string, createGigDto: CreateGigDto) {
    if (createGigDto.budgetMin > createGigDto.budgetMax) {
      throw new BadRequestException('Budget minimum cannot exceed maximum');
    }

    if (createGigDto.expiresAt && createGigDto.expiresAt < new Date()) {
      throw new BadRequestException('Expiration date cannot be in the past');
    }

    return await this.prisma.gig.create({
      data: {
        ...createGigDto,
        category: createGigDto.category as PrismaGigCategory,
        budgetType: createGigDto.budgetType as PrismaGigBudgetType,
        experienceLevel: createGigDto.experienceLevel as PrismaGigExperienceLevel,
        creatorId,
        status: PrismaGigStatus.DRAFT,
        applicationsCount: 0,
        viewsCount: 0,
      },
    }) as any;
  }

  /**
   * Publish a draft gig (make it visible to others)
   */
  async publish(gigId: string, creatorId: string) {
    const gig = await this.findOne(gigId);

    if (gig.creatorId !== creatorId) {
      throw new ForbiddenException('Only the creator can publish this gig');
    }

    if (gig.status !== GigStatus.DRAFT) {
      throw new BadRequestException('Only draft gigs can be published');
    }

    return await this.prisma.gig.update({
      where: { id: gigId },
      data: { status: PrismaGigStatus.OPEN },
    }) as any;
  }

  /**
   * Find all gigs with advanced search and filtering
   */
  async findAll(searchDto: GigSearchDto): Promise<PaginatedGigs> {
    const {
      query,
      category,
      budgetMin,
      budgetMax,
      budgetType,
      experienceLevel,
      skills,
      sortBy,
      page = 1,
      limit = 20,
    } = searchDto;

    const where: Prisma.GigWhereInput = {
      status: PrismaGigStatus.OPEN,
      deletedAt: null,
    };

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { skills: { hasSome: [query] } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (budgetMin !== undefined) {
      where.budgetMax = { gte: budgetMin };
    }

    if (budgetMax !== undefined) {
      where.budgetMin = { lte: budgetMax };
    }

    if (budgetType) {
      where.budgetType = budgetType;
    }

    if (experienceLevel) {
      where.experienceLevel = experienceLevel;
    }

    if (skills && skills.length > 0) {
      where.skills = { hasSome: skills };
    }

    const orderBy: Prisma.GigOrderByWithRelationInput =
      sortBy === 'budget_high'
        ? { budgetMax: Prisma.SortOrder.desc }
        : sortBy === 'budget_low'
        ? { budgetMin: Prisma.SortOrder.asc }
        : sortBy === 'deadline'
        ? { expiresAt: Prisma.SortOrder.asc }
        : { createdAt: Prisma.SortOrder.desc };

    const skip = (page - 1) * limit;

    const [gigs, total] = await Promise.all([
      this.prisma.gig.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          creator: { include: { profile: true } },
        },
      }),
      this.prisma.gig.count({ where }),
    ]);

    return {
      gigs: gigs as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find one gig by ID with details
   */
  async findOne(id: string): Promise<GigWithDetails> {
    const gig = await this.prisma.gig.findUnique({
      where: { id },
      include: {
        creator: { include: { profile: true } },
        milestones: true,
        escrows: true,
      },
    });

    if (!gig || gig.deletedAt) {
      throw new NotFoundException('Gig not found');
    }

    const acceptedApplication = await this.prisma.application.findFirst({
      where: { gigId: id, status: 'ACCEPTED' },
      include: {
        applicant: { include: { profile: true } },
        escrow: true,
        milestones: true,
      },
    });

    return {
      ...(gig as any),
      acceptedApplication: acceptedApplication as any,
      milestones: gig.milestones,
      escrow: gig.escrows?.[0] ?? undefined,
    } as GigWithDetails;
  }

  /**
   * Find gigs created by a specific user
   */
  async findByCreator(creatorId: string, page = 1, limit = 20): Promise<PaginatedGigs> {
    const skip = (page - 1) * limit;

    const [gigs, total] = await Promise.all([
      this.prisma.gig.findMany({
        where: { creatorId, deletedAt: null },
        include: { creator: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.gig.count({ where: { creatorId, deletedAt: null } }),
    ]);

    return {
      gigs: gigs as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update a gig
   */
  async update(id: string, creatorId: string, updateGigDto: UpdateGigDto) {
    const gig = await this.findOne(id);

    if (gig.creatorId !== creatorId) {
      throw new ForbiddenException('Only the creator can update this gig');
    }

    if (([GigStatus.IN_PROGRESS, GigStatus.COMPLETED] as GigStatus[]).includes(gig.status)) {
      throw new BadRequestException('Cannot edit gigs that are in progress or completed');
    }

    const newBudgetMin = updateGigDto.budgetMin ?? gig.budgetMin;
    const newBudgetMax = updateGigDto.budgetMax ?? gig.budgetMax;
    if (newBudgetMin > newBudgetMax) {
      throw new BadRequestException('Budget minimum cannot exceed maximum');
    }

    return await this.prisma.gig.update({
      where: { id },
      data: updateGigDto,
    });
  }

  /**
   * Cancel a gig
   */
  async cancel(id: string, creatorId: string) {
    const gig = await this.findOne(id);

    if (gig.creatorId !== creatorId) {
      throw new ForbiddenException('Only the creator can cancel this gig');
    }

    if (gig.status === GigStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed gig');
    }

    if (gig.status === GigStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot cancel a gig in progress. Please raise a dispute instead.');
    }

    return await this.prisma.gig.update({
      where: { id },
      data: { status: PrismaGigStatus.CANCELLED },
    });
  }

  /**
   * Mark gig as in progress (when application is accepted)
   */
  async markInProgress(id: string) {
    return await this.prisma.gig.update({
      where: { id },
      data: { status: PrismaGigStatus.IN_PROGRESS },
    });
  }

  /**
   * Mark gig as completed
   */
  async markCompleted(id: string, userId: string) {
    const gig = await this.findOne(id);

    if (gig.creatorId !== userId) {
      throw new ForbiddenException('Only the creator can mark this gig as completed');
    }

    if (gig.status !== GigStatus.IN_PROGRESS) {
      throw new BadRequestException('Only gigs in progress can be marked as completed');
    }

    return await this.prisma.gig.update({
      where: { id },
      data: { status: PrismaGigStatus.COMPLETED },
    });
  }

  /**
   * Increment view count
   */
  async incrementViews(id: string): Promise<void> {
    await this.prisma.gig.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });
  }

  /**
   * Increment application count
   */
  async incrementApplications(id: string): Promise<void> {
    await this.prisma.gig.update({
      where: { id },
      data: { applicationsCount: { increment: 1 } },
    });
  }

  /**
   * Get statistics for a creator
   */
  async getCreatorStats(creatorId: string): Promise<GigStats> {
    const gigs = await this.prisma.gig.findMany({
      where: { creatorId, deletedAt: null },
    });

    const totalGigs = gigs.length;
    const activeGigs = gigs.filter(
      g => g.status === GigStatus.OPEN || g.status === GigStatus.IN_PROGRESS,
    ).length;
    const completedGigs = gigs.filter(g => g.status === GigStatus.COMPLETED).length;

    return {
      totalGigs,
      activeGigs,
      completedGigs,
      totalEarned: 0,
      totalSpent: 0,
      averageRating: 0,
      reviewsCount: 0,
    };
  }

  /**
   * Get recommended gigs for a user based on their skills/interests
   */
  async getRecommendedGigs(_userId: string, limit = 10) {
    const gigs = await this.prisma.gig.findMany({
      where: { status: PrismaGigStatus.OPEN, deletedAt: null },
      orderBy: [
        { viewsCount: 'desc' },
        { applicationsCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      include: { creator: { include: { profile: true } } },
    });

    return gigs.map(gig => ({
      ...gig,
      status: gig.status as GigStatus,
      category: gig.category as GigCategory,
      budgetType: gig.budgetType as GigBudgetType,
      experienceLevel: gig.experienceLevel as GigExperienceLevel,
      creator: gig.creator.profile ? {
        id: gig.creator.id,
        username: gig.creator.profile.username,
        displayName: gig.creator.profile.displayName,
        avatar: gig.creator.profile.avatarUrl,
        bio: gig.creator.profile.bio,
        verified: gig.creator.profile.isVerified,
      } : undefined,
    }));
  }

  /**
   * Soft delete a gig
   */
  async remove(id: string, creatorId: string): Promise<void> {
    const gig = await this.findOne(id);

    if (gig.creatorId !== creatorId) {
      throw new ForbiddenException('Only the creator can delete this gig');
    }

    if (gig.status === GigStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete a gig in progress');
    }

    await this.prisma.gig.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
