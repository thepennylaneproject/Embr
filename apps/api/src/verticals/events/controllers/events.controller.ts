import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { EventsService } from '../services/events.service';
import { EventAttendeesService } from '../services/event-attendees.service';
import { EventRecapService } from '../services/event-recap.service';
import { CreateEventDto, UpdateEventDto, EventSearchDto, RsvpDto, CreateEventRecapDto } from '../dto/event.dto';
import { RequestWithUser } from '../../../shared/types/request-with-user';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly attendeesService: EventAttendeesService,
    private readonly recapService: EventRecapService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: RequestWithUser, @Body() dto: CreateEventDto) {
    return this.eventsService.create(req.user.id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.eventsService.publish(id, req.user.id);
  }

  @Get()
  @Public()
  async findAll(@Query() searchDto: EventSearchDto) {
    return this.eventsService.findAll(searchDto);
  }

  @Get('mine')
  async getMyEvents(@Request() req: RequestWithUser) {
    return this.eventsService.getMyEvents(req.user.id);
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.eventsService.findOne(id, req.user?.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Request() req: RequestWithUser, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, req.user.id, dto);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.eventsService.cancel(id, req.user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.eventsService.delete(id, req.user.id);
  }

  // RSVP
  @Post(':id/rsvp')
  @HttpCode(HttpStatus.OK)
  async rsvp(@Param('id') id: string, @Request() req: RequestWithUser, @Body() dto: RsvpDto) {
    return this.attendeesService.rsvp(id, req.user.id, dto);
  }

  @Delete(':id/rsvp')
  @HttpCode(HttpStatus.OK)
  async cancelRsvp(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.attendeesService.cancelRsvp(id, req.user.id);
  }

  @Get(':id/attendees')
  @Public()
  async getAttendees(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.attendeesService.getAttendees(id, cursor, limit ? parseInt(limit) : 20);
  }

  // Recap
  @Post(':id/recap')
  @HttpCode(HttpStatus.CREATED)
  async createRecap(@Param('id') id: string, @Request() req: RequestWithUser, @Body() dto: CreateEventRecapDto) {
    return this.recapService.createRecap(id, req.user.id, dto);
  }

  @Get(':id/recap')
  @Public()
  async getRecap(@Param('id') id: string) {
    return this.recapService.getRecap(id);
  }
}
