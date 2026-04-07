import {
  Controller,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { MutualAidResponsesService } from '../services/mutual-aid-responses.service';
import { CreateMutualAidResponseDto } from '../dto/mutual-aid.dto';
import { RequestWithUser } from '../../../shared/types/request-with-user';

@Controller('mutual-aid/:postId/responses')
@UseGuards(JwtAuthGuard)
export class MutualAidResponsesController {
  constructor(private readonly responsesService: MutualAidResponsesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async respond(
    @Param('postId') postId: string,
    @Request() req: RequestWithUser,
    @Body() dto: CreateMutualAidResponseDto,
  ) {
    return this.responsesService.respond(postId, req.user.id, dto);
  }

  @Put(':responseId/accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @Param('postId') postId: string,
    @Param('responseId') responseId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.responsesService.accept(postId, responseId, req.user.id);
  }

  @Put(':responseId/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @Param('postId') postId: string,
    @Param('responseId') responseId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.responsesService.complete(postId, responseId, req.user.id);
  }

  @Put(':responseId/decline')
  @HttpCode(HttpStatus.OK)
  async decline(
    @Param('postId') postId: string,
    @Param('responseId') responseId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.responsesService.decline(postId, responseId, req.user.id);
  }
}
