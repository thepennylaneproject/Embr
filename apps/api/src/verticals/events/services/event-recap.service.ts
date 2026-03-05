import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateEventRecapDto } from '../dto/event.dto';

@Injectable()
export class EventRecapService {
  constructor(private readonly prisma: PrismaService) {}

  async createRecap(eventId: string, userId: string, dto: CreateEventRecapDto) {
    const event = await this.prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId !== userId) throw new ForbiddenException('Only the event host can create a recap');

    const existing = await this.prisma.eventRecap.findUnique({ where: { eventId } });
    if (existing) throw new ConflictException('Recap already exists for this event');

    // Auto-create a group post if this is a group event
    let postId: string | undefined;
    if (event.groupId) {
      const post = await this.prisma.post.create({
        data: {
          authorId: userId,
          type: 'TEXT',
          content: `📸 Event recap: **${event.title}**${dto.notes ? `\n\n${dto.notes}` : ''}`,
          groupId: event.groupId,
          visibility: 'PUBLIC',
          hashtags: [],
          mentions: [],
        },
      });
      postId = post.id;
    }

    const recap = await this.prisma.eventRecap.create({
      data: {
        eventId,
        postId,
        notes: dto.notes,
        mediaUrls: dto.mediaUrls ?? [],
      },
    });

    // Mark event as completed
    await this.prisma.event.update({ where: { id: eventId }, data: { status: 'COMPLETED' } });

    return recap;
  }

  async getRecap(eventId: string) {
    const recap = await this.prisma.eventRecap.findUnique({
      where: { eventId },
      include: { post: { select: { id: true, content: true, createdAt: true } } },
    });
    if (!recap) throw new NotFoundException('No recap found for this event');
    return recap;
  }
}
