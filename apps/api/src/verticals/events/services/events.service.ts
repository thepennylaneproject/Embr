import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateEventDto, UpdateEventDto, EventSearchDto } from '../dto/event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateEventDto) {
    if (dto.groupId) {
      const membership = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: dto.groupId, userId } },
      });
      if (!membership) throw new ForbiddenException('You must be a group member to create a group event');
    }

    return this.prisma.event.create({
      data: {
        hostId: userId,
        title: dto.title,
        description: dto.description,
        eventType: dto.eventType as any,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        timezone: dto.timezone ?? 'UTC',
        location: dto.location,
        virtualLink: dto.virtualLink,
        coverUrl: dto.coverUrl,
        maxAttendees: dto.maxAttendees,
        isTicketed: dto.isTicketed ?? false,
        pricingType: (dto.pricingType ?? 'FREE') as any,
        minPrice: dto.minPrice,
        suggestedPrice: dto.suggestedPrice,
        tags: dto.tags ?? [],
        groupId: dto.groupId,
        linkedMutualAidId: dto.linkedMutualAidId,
        status: 'DRAFT',
      },
      include: {
        host: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        group: { select: { id: true, name: true, slug: true } },
        _count: { select: { attendees: true } },
      },
    });
  }

  async publish(id: string, userId: string) {
    await this.assertHost(id, userId);
    return this.prisma.event.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }

  async findAll(dto: EventSearchDto) {
    const limit = Math.min(dto.limit ?? 20, 50);
    const where: any = { deletedAt: null, status: 'PUBLISHED' };

    if (dto.q) {
      where.OR = [
        { title: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
      ];
    }
    if (dto.eventType) where.eventType = dto.eventType;
    if (dto.groupId) where.groupId = dto.groupId;
    if (dto.hostId) where.hostId = dto.hostId;
    if (dto.upcoming === true || dto.upcoming === undefined) {
      where.startAt = { gte: new Date() };
    } else if (dto.upcoming === false) {
      where.startAt = { lt: new Date() };
    }
    if (dto.from) where.startAt = { ...where.startAt, gte: new Date(dto.from) };
    if (dto.to) where.startAt = { ...where.startAt, lte: new Date(dto.to) };
    if (dto.cursor) where.startAt = { ...where.startAt, gt: new Date(dto.cursor) };

    const events = await this.prisma.event.findMany({
      where,
      take: limit + 1,
      orderBy: { startAt: 'asc' },
      include: {
        host: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        group: { select: { id: true, name: true, slug: true } },
        _count: { select: { attendees: true } },
      },
    });

    const hasMore = events.length > limit;
    const items = hasMore ? events.slice(0, limit) : events;
    return {
      items,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].startAt.toISOString() : null,
    };
  }

  async findOne(id: string, userId?: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: {
        host: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true, bio: true } } } },
        group: { select: { id: true, name: true, slug: true, avatarUrl: true } },
        linkedMutualAid: { select: { id: true, title: true, type: true, category: true } },
        recap: true,
        _count: { select: { attendees: true } },
      },
    });
    if (!event) throw new NotFoundException('Event not found');

    let myRsvp = null;
    if (userId) {
      myRsvp = await this.prisma.eventAttendee.findUnique({
        where: { eventId_userId: { eventId: id, userId } },
      });
    }

    return { ...event, myRsvp };
  }

  async update(id: string, userId: string, dto: UpdateEventDto) {
    await this.assertHost(id, userId);
    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        eventType: dto.eventType as any,
        pricingType: dto.pricingType as any,
      },
    });
  }

  async cancel(id: string, userId: string) {
    await this.assertHost(id, userId);
    return this.prisma.event.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async complete(id: string, userId: string) {
    await this.assertHost(id, userId);
    return this.prisma.event.update({ where: { id }, data: { status: 'COMPLETED' } });
  }

  async delete(id: string, userId: string) {
    await this.assertHost(id, userId);
    return this.prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getMyEvents(userId: string) {
    return this.prisma.event.findMany({
      where: { hostId: userId, deletedAt: null },
      orderBy: { startAt: 'asc' },
      include: { _count: { select: { attendees: true } } },
    });
  }

  private async assertHost(eventId: string, userId: string) {
    const event = await this.prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId !== userId) throw new ForbiddenException('Only the event host can perform this action');
    return event;
  }
}
