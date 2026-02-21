/**
 * Messaging Controller
 * REST API endpoints for messaging operations
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessagingService } from '../services/messaging.service';
import { UploadService } from '../../upload/upload.service';
import {
  SendMessageDto,
  MarkAsReadDto,
  GetConversationsDto,
  GetMessagesDto,
  SearchMessagesDto,
  CreateConversationDto,
  DeleteMessageDto,
  DeleteConversationDto,
  MediaUploadDto,
} from '../dto/messaging.dto';
import {
  MESSAGE_CONSTRAINTS,
  MessageType,
} from '../../../shared/types/messaging.types';

@ApiTags('Messaging')
@Controller('messaging')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class MessagingController {
  constructor(
    private messagingService: MessagingService,
    private uploadService: UploadService,
  ) {}

  // ============================================================
  // CONVERSATION ENDPOINTS
  // ============================================================

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations with pagination' })
  @ApiResponse({ status: 200, description: 'Returns list of conversations' })
  async getConversations(@Request() req, @Query() dto: GetConversationsDto) {
    return this.messagingService.getConversations(req.user.id, dto);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create or get existing conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created or retrieved' })
  async createConversation(@Request() req, @Body() dto: CreateConversationDto) {
    return this.messagingService.getOrCreateConversation(req.user.id, dto);
  }

  @Delete('conversations/:conversationId')
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation deleted' })
  async deleteConversation(@Request() req, @Param('conversationId') conversationId: string) {
    return this.messagingService.deleteConversation(req.user.id, {
      conversationId,
    });
  }

  // ============================================================
  // MESSAGE ENDPOINTS
  // ============================================================

  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(@Request() req, @Body() dto: SendMessageDto) {
    return this.messagingService.sendMessage(req.user.id, dto);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiResponse({ status: 200, description: 'Returns list of messages' })
  async getMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query() query: Omit<GetMessagesDto, 'conversationId'>,
  ) {
    const dto: GetMessagesDto = {
      conversationId,
      page: query.page,
      limit: query.limit,
      before: query.before,
      after: query.after,
    };
    return this.messagingService.getMessages(req.user.id, dto);
  }

  @Post('messages/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(@Request() req, @Body() dto: MarkAsReadDto) {
    return this.messagingService.markAsRead(req.user.id, dto);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  async deleteMessage(
    @Request() req,
    @Param('messageId') messageId: string,
    @Query('conversationId') conversationId: string,
  ) {
    if (!conversationId) {
      throw new BadRequestException('conversationId query parameter is required');
    }
    return this.messagingService.deleteMessage(req.user.id, {
      messageId,
      conversationId,
    });
  }

  // ============================================================
  // SEARCH ENDPOINT
  // ============================================================

  @Get('conversations/:conversationId/search')
  @ApiOperation({ summary: 'Search messages within a conversation' })
  @ApiResponse({ status: 200, description: 'Returns matching messages' })
  async searchMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query() query: Omit<SearchMessagesDto, 'conversationId'>,
  ) {
    const dto: SearchMessagesDto = {
      conversationId,
      query: query.query,
      page: query.page,
      limit: query.limit,
    };
    return this.messagingService.searchMessages(req.user.id, dto);
  }

  // ============================================================
  // UNREAD COUNT ENDPOINT
  // ============================================================

  @Get('unread')
  @ApiOperation({ summary: 'Get unread message count' })
  @ApiResponse({ status: 200, description: 'Returns unread counts' })
  async getUnreadCount(@Request() req) {
    return this.messagingService.getUnreadCount(req.user.id);
  }

  // ============================================================
  // MEDIA UPLOAD ENDPOINT
  // ============================================================

  @Post('media/upload')
  @ApiOperation({ summary: 'Upload media for messaging' })
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: MediaUploadDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    if (file.size > MESSAGE_CONSTRAINTS.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum of ${MESSAGE_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Validate file type based on message type
    const allowedTypes = this.getAllowedFileTypes(dto.type);
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types for ${dto.type}: ${allowedTypes.join(', ')}`,
      );
    }

    let uploadResult: { url: string };

    // Upload to appropriate service
    switch (dto.type) {
      case MessageType.IMAGE:
        uploadResult = await this.uploadService.uploadImage(file);
        break;
      case MessageType.VIDEO:
        uploadResult = await this.uploadService.uploadVideo(file);
        break;
      case MessageType.FILE:
        uploadResult = await this.uploadService.uploadFile(file);
        break;
      default:
        throw new BadRequestException('Invalid message type for upload');
    }

    return {
      url: uploadResult.url,
      mediaType: file.mimetype,
      fileName: file.originalname,
      fileSize: file.size,
      type: dto.type,
      conversationId: dto.conversationId,
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private getAllowedFileTypes(messageType: MessageType): string[] {
    switch (messageType) {
      case MessageType.IMAGE:
        return [...MESSAGE_CONSTRAINTS.ALLOWED_IMAGE_TYPES];
      case MessageType.VIDEO:
        return [...MESSAGE_CONSTRAINTS.ALLOWED_VIDEO_TYPES];
      case MessageType.FILE:
        return [...MESSAGE_CONSTRAINTS.ALLOWED_FILE_TYPES];
      default:
        return [];
    }
  }
}
