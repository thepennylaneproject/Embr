import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { ContributeDto, DisburseDto } from '../dto/organizing.dto';
import { GroupMemberRole } from '../dto/group.dto';

const PLATFORM_FEE_PERCENT = 0.02;
const DISBURSEMENT_POLL_THRESHOLD_CENTS = 5000; // $50 requires a poll

@Injectable()
export class TreasuryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getOrCreate(groupId: string) {
    const existing = await this.prisma.groupTreasury.findUnique({ where: { groupId } });
    if (existing) return existing;
    return this.prisma.groupTreasury.create({
      data: { groupId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  async getTreasury(groupId: string, userId: string) {
    await this.assertMember(groupId, userId);
    const treasury = await this.prisma.groupTreasury.findUnique({
      where: { groupId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: {
            contributor: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          },
        },
      },
    });
    if (!treasury) return this.getOrCreate(groupId);
    return treasury;
  }

  async contribute(groupId: string, userId: string, dto: ContributeDto) {
    await this.assertMember(groupId, userId);

    const platformFee = Math.round(dto.amount * PLATFORM_FEE_PERCENT);
    const netAmount = dto.amount - platformFee;

    await this.prisma.$transaction(async (tx) => {
      let treasury = await tx.groupTreasury.findUnique({ where: { groupId } });
      if (!treasury) {
        treasury = await tx.groupTreasury.create({ data: { groupId } });
      }

      await tx.groupTreasuryTransaction.create({
        data: {
          treasuryId: treasury.id,
          type: 'CONTRIBUTION',
          amount: netAmount,
          description: dto.description ?? `Contribution from member`,
          contributorId: userId,
          stripePaymentIntentId: dto.stripePaymentIntentId,
        },
      });

      if (platformFee > 0) {
        await tx.groupTreasuryTransaction.create({
          data: {
            treasuryId: treasury.id,
            type: 'PLATFORM_FEE',
            amount: platformFee,
            description: '2% platform fee',
          },
        });
      }

      await tx.groupTreasury.update({
        where: { groupId },
        data: {
          balance: { increment: netAmount },
          totalRaised: { increment: netAmount },
        },
      });
    });

    // Notify group admins
    const admins = await this.prisma.groupMember.findMany({
      where: { groupId, role: { in: ['ADMIN', 'MODERATOR'] }, userId: { not: userId } },
      select: { userId: true },
    });
    await Promise.all(
      admins.map((a) =>
        this.notifications.create({
          userId: a.userId,
          type: 'TREASURY_CONTRIBUTION',
          title: 'Treasury contribution received',
          message: `$${(dto.amount / 100).toFixed(2)} contributed to the group treasury`,
          actorId: userId,
          referenceId: groupId,
          referenceType: 'group',
        }),
      ),
    );

    return this.getTreasury(groupId, userId);
  }

  async disburse(groupId: string, userId: string, dto: DisburseDto) {
    await this.assertAdmin(groupId, userId);

    const treasury = await this.prisma.groupTreasury.findUnique({ where: { groupId } });
    if (!treasury) throw new NotFoundException('Treasury not initialized');
    if (treasury.balance < dto.amount) throw new BadRequestException('Insufficient treasury balance');

    if (dto.amount >= DISBURSEMENT_POLL_THRESHOLD_CENTS && !dto.pollId) {
      throw new BadRequestException(
        `Disbursements of $${(DISBURSEMENT_POLL_THRESHOLD_CENTS / 100).toFixed(0)}+ require a group poll approval. Create a poll first and provide its ID.`,
      );
    }

    if (dto.pollId) {
      const poll = await this.prisma.poll.findFirst({ where: { id: dto.pollId, groupId } });
      if (!poll) throw new NotFoundException('Poll not found');
      if (poll.status !== 'CLOSED') throw new BadRequestException('Poll must be closed before disbursing');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.groupTreasuryTransaction.create({
        data: {
          treasuryId: treasury.id,
          type: 'DISBURSEMENT',
          amount: dto.amount,
          description: dto.purpose,
          contributorId: userId,
          pollId: dto.pollId,
        },
      });
      await tx.groupTreasury.update({
        where: { groupId },
        data: { balance: { decrement: dto.amount } },
      });
    });

    // Notify all members
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, userId: { not: userId } },
      select: { userId: true },
    });
    await Promise.all(
      members.map((m) =>
        this.notifications.create({
          userId: m.userId,
          type: 'TREASURY_DISBURSEMENT',
          title: 'Treasury disbursement',
          message: `$${(dto.amount / 100).toFixed(2)} disbursed: ${dto.purpose}`,
          actorId: userId,
          referenceId: groupId,
          referenceType: 'group',
        }),
      ),
    );

    return this.getTreasury(groupId, userId);
  }

  private async assertMember(groupId: string, userId: string) {
    const m = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!m) throw new ForbiddenException('You must be a group member');
    return m;
  }

  private async assertAdmin(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership || membership.role !== GroupMemberRole.ADMIN) {
      throw new ForbiddenException('Only group admins can disburse funds');
    }
    return membership;
  }
}
