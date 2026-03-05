import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { CreatePollDto, VoteDto } from '../dto/organizing.dto';
import { GroupMemberRole } from '../dto/group.dto';

@Injectable()
export class PollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(groupId: string, userId: string, dto: CreatePollDto) {
    await this.assertMember(groupId, userId);

    const poll = await this.prisma.poll.create({
      data: {
        authorId: userId,
        groupId,
        question: dto.question,
        description: dto.description,
        multiSelect: dto.multiSelect ?? false,
        isAnonymous: dto.isAnonymous ?? false,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        options: {
          create: dto.options.map((text) => ({ text })),
        },
      },
      include: {
        author: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        options: true,
        _count: { select: { votes: true } },
      },
    });

    return poll;
  }

  async findAll(groupId: string) {
    return this.prisma.poll.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        options: { include: { _count: { select: { votes: true } } } },
        _count: { select: { votes: true } },
      },
    });
  }

  async vote(groupId: string, pollId: string, userId: string, dto: VoteDto) {
    await this.assertMember(groupId, userId);

    const poll = await this.prisma.poll.findFirst({ where: { id: pollId, groupId } });
    if (!poll) throw new NotFoundException('Poll not found');
    if (poll.status === 'CLOSED') throw new BadRequestException('Poll is closed');
    if (poll.endsAt && poll.endsAt < new Date()) throw new BadRequestException('Poll has ended');

    if (!poll.multiSelect && dto.optionIds.length > 1) {
      throw new BadRequestException('This poll only allows one vote');
    }

    // Validate all option IDs belong to this poll
    const options = await this.prisma.pollOption.findMany({
      where: { id: { in: dto.optionIds }, pollId },
    });
    if (options.length !== dto.optionIds.length) {
      throw new BadRequestException('Invalid option(s)');
    }

    // Check for existing votes
    const existingVotes = await this.prisma.pollVote.findMany({
      where: { pollId, userId },
    });

    if (existingVotes.length > 0 && !poll.multiSelect) {
      throw new ConflictException('You have already voted in this poll');
    }

    // Filter out already-voted options
    const alreadyVotedOptionIds = existingVotes.map((v) => v.optionId);
    const newOptionIds = dto.optionIds.filter((id) => !alreadyVotedOptionIds.includes(id));

    if (newOptionIds.length === 0) throw new ConflictException('Already voted for these options');

    await this.prisma.$transaction(async (tx) => {
      for (const optionId of newOptionIds) {
        await tx.pollVote.create({ data: { pollId, optionId, userId } });
        await tx.pollOption.update({ where: { id: optionId }, data: { voteCount: { increment: 1 } } });
      }
    });

    return this.getResults(pollId, userId, poll.isAnonymous);
  }

  async close(groupId: string, pollId: string, userId: string) {
    await this.assertModOrAdmin(groupId, userId);
    const poll = await this.prisma.poll.findFirst({ where: { id: pollId, groupId } });
    if (!poll) throw new NotFoundException('Poll not found');

    const updated = await this.prisma.poll.update({ where: { id: pollId }, data: { status: 'CLOSED' } });

    // Notify group members
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, userId: { not: userId } },
      select: { userId: true },
    });
    await Promise.all(
      members.map((m) =>
        this.notifications.create({
          userId: m.userId,
          type: 'POLL_CLOSED',
          title: 'Poll results are in',
          message: `"${poll.question}" has closed`,
          actorId: userId,
          referenceId: pollId,
          referenceType: 'poll',
        }),
      ),
    );

    return updated;
  }

  async getResults(pollId: string, requesterId: string, forceAnonymous?: boolean) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            _count: { select: { votes: true } },
            votes: forceAnonymous
              ? false
              : { where: { userId: requesterId }, select: { id: true } },
          },
        },
        _count: { select: { votes: true } },
      },
    });
    if (!poll) throw new NotFoundException('Poll not found');
    return poll;
  }

  private async assertMember(groupId: string, userId: string) {
    const m = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!m) throw new ForbiddenException('You must be a group member to vote');
    return m;
  }

  private async assertModOrAdmin(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new ForbiddenException('You must be a group member');
    const roleOrder = { MEMBER: 0, MODERATOR: 1, ADMIN: 2 };
    if (roleOrder[membership.role] < roleOrder[GroupMemberRole.MODERATOR]) {
      throw new ForbiddenException('Only moderators or admins can close polls');
    }
    return membership;
  }
}
