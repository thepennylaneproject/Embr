/**
 * Messaging DTOs (Data Transfer Objects)
 * Validation schemas for messaging API endpoints
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsNotEmpty,
  ValidateNested,
  IsArray,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType, MessageStatus } from '../../../shared/types/messaging.types';

// ============================================================
// SEND MESSAGE DTO
// ============================================================

export class SendMessageDto {
  @ApiPropertyOptional({
    description: 'Conversation ID (required if no recipientId)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Conversation ID must be a valid UUID' })
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Recipient user ID (required if no conversationId)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Recipient ID must be a valid UUID' })
  recipientId?: string;

  @ApiPropertyOptional({
    description: 'Message text content',
    example: 'Hey! How are you?',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Message content cannot exceed 5000 characters' })
  content?: string;

  @ApiPropertyOptional({
    description: 'URL of uploaded media file',
    example: 'https://cdn.embr.com/files/abc123.jpg',
  })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({
    description: 'MIME type of media file',
    example: 'image/jpeg',
  })
  @IsOptional()
  @IsString()
  mediaType?: string;

  @ApiPropertyOptional({
    description: 'Original filename',
    example: 'screenshot.png',
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 1024000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiProperty({
    description: 'Message type',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  @IsEnum(MessageType, { message: 'Invalid message type' })
  type: MessageType;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { replyToId: 'abc123' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ============================================================
// MARK AS READ DTO
// ============================================================

export class MarkAsReadDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'Conversation ID must be a valid UUID' })
  conversationId: string;

  @ApiPropertyOptional({
    description: 'Specific message IDs to mark as read (if not provided, marks all unread)',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each message ID must be a valid UUID' })
  messageIds?: string[];
}

// ============================================================
// GET CONVERSATIONS DTO
// ============================================================

export class GetConversationsDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of conversations per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search query to filter conversations',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

// ============================================================
// GET MESSAGES DTO
// ============================================================

export class GetMessagesDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'Conversation ID must be a valid UUID' })
  conversationId: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of messages per page',
    example: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Get messages before this message ID (for pagination)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4')
  before?: string;

  @ApiPropertyOptional({
    description: 'Get messages after this message ID (for pagination)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4')
  after?: string;
}

// ============================================================
// SEARCH MESSAGES DTO
// ============================================================

export class SearchMessagesDto {
  @ApiProperty({
    description: 'Conversation ID to search within',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'Conversation ID must be a valid UUID' })
  conversationId: string;

  @ApiProperty({
    description: 'Search query',
    example: 'project deadline',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  query: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ============================================================
// CREATE CONVERSATION DTO
// ============================================================

export class CreateConversationDto {
  @ApiProperty({
    description: 'ID of the user to start a conversation with',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'Participant ID must be a valid UUID' })
  participantId: string;

  @ApiPropertyOptional({
    description: 'Optional initial message',
    example: 'Hi! I saw your portfolio and wanted to connect.',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  initialMessage?: string;
}

// ============================================================
// DELETE MESSAGE DTO
// ============================================================

export class DeleteMessageDto {
  @ApiProperty({
    description: 'Message ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'Message ID must be a valid UUID' })
  messageId: string;

  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'Conversation ID must be a valid UUID' })
  conversationId: string;
}

// ============================================================
// DELETE CONVERSATION DTO
// ============================================================

export class DeleteConversationDto {
  @ApiProperty({
    description: 'Conversation ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'Conversation ID must be a valid UUID' })
  conversationId: string;
}

// ============================================================
// TYPING INDICATOR DTO
// ============================================================

export class TypingIndicatorDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'Conversation ID must be a valid UUID' })
  conversationId: string;

  @ApiProperty({
    description: 'Whether user is typing',
    example: true,
  })
  @IsBoolean()
  isTyping: boolean;
}

// ============================================================
// MEDIA UPLOAD DTO
// ============================================================

export class MediaUploadDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'Conversation ID must be a valid UUID' })
  conversationId: string;

  @ApiProperty({
    description: 'Media type',
    enum: MessageType,
    example: MessageType.IMAGE,
  })
  @IsEnum(MessageType, { message: 'Invalid media type' })
  type: MessageType;
}
