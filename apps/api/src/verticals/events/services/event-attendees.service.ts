import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { RsvpDto, RsvpStatus } from '../dto/event.dto';

const PLATFORM_FEE_PERCENT = 0.02;

@Injectable()
export class EventAttendeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async rsvp(eventId: string, userId: string, dto: RsvpDto) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null, status: 'PUBLISHED' },
    });
    if (!event) throw new NotFoundException('Event not found or not published');
    if (event.hostId === userId) throw new BadRequestException('Host cannot RSVP to their own event');

    if (event.maxAttendees) {
      const count = await this.prisma.eventAttendee.count({
        where: { eventId, status: 'GOING' },
      });
      if (count >= event.maxAttendees && dto.status === RsvpStatus.GOING) {
        throw new BadRequestException('Event is at capacity');
      }
    }

    if (event.isTicketed && dto.status === RsvpStatus.GOING) {
      const minRequired = event.pricingType === 'FREE' ? 0 : (event.minPrice ?? 0);
      if ((dto.amountPaid ?? 0) < minRequired) {
        throw new BadRequestException(`Minimum payment of ${minRequired} cents required`);
      }
    }

    const existing = await this.prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    let attendee;
    if (existing) {
      attendee = await this.prisma.eventAttendee.update({
        where: { eventId_userId: { eventId, userId } },
        data: {
          status: dto.status as any,
          amountPaid: dto.amountPaid,
          stripePaymentIntentId: dto.stripePaymentIntentId,
        },
      });
    } else {
      attendee = await this.prisma.eventAttendee.create({
        data: {
          eventId,
          userId,
          status: dto.status as any,
          amountPaid: dto.amountPaid,
          stripePaymentIntentId: dto.stripePaymentIntentId,
        },
      });

      if (dto.status === RsvpStatus.GOING) {
        await this.notifications.create({
          userId: event.hostId,
          type: 'EVENT_RSVP',
          title: 'New RSVP',
          message: `Someone is going to "${event.title}"`,
          actorId: userId,
          referenceId: eventId,
          referenceType: 'event',
        });
      }
    }

    return attendee;
  }

  async cancelRsvp(eventId: string, userId: string) {
    const attendee = await this.prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!attendee) throw new NotFoundException('RSVP not found');
    await this.prisma.eventAttendee.delete({
      where: { eventId_userId: { eventId, userId } },
    });
    return { success: true };
  }

  async getAttendees(eventId: string, cursor?: string, limit = 20) {
    const actualLimit = Math.min(limit, 100);
    const where: any = { eventId, status: 'GOING' };
    if (cursor) where.id = { lt: cursor };

    const attendees = await this.prisma.eventAttendee.findMany({
      where,
      take: actualLimit + 1,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });

    const hasMore = attendees.length > actualLimit;
    const items = hasMore ? attendees.slice(0, actualLimit) : attendees;
    return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  getPlatformFee(amount: number) {
    return Math.round(amount * PLATFORM_FEE_PERCENT);
  }
}
