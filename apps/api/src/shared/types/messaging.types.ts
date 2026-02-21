/**
 * Shared TypeScript types for Direct Messaging
 * Used across frontend and backend
 */

// ============================================================
// MESSAGE TYPES
// ============================================================

export const MessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  FILE: 'FILE',
  LOCATION: 'LOCATION',
  GIG_OFFER: 'GIG_OFFER',
  GIG_MILESTONE: 'GIG_MILESTONE',
} as const;
export type MessageType = typeof MessageType[keyof typeof MessageType];

export const MessageStatus = {
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
} as const;
export type MessageStatus = typeof MessageStatus[keyof typeof MessageStatus];

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  type: MessageType;
  status: MessageStatus;
  createdAt: string;
  readAt?: string;
  metadata?: Record<string, any>;
  
  // Populated fields
  sender?: UserPreview;
}

export interface MessageWithSender extends Message {
  sender: UserPreview;
}

// ============================================================
// CONVERSATION TYPES
// ============================================================

export interface Conversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  lastMessageAt: string;
  createdAt: string;
  
  // Populated fields
  participant1?: UserPreview;
  participant2?: UserPreview;
  lastMessage?: Message;
  unreadCount?: number;
}

export interface ConversationWithDetails extends Conversation {
  participant1: UserPreview;
  participant2: UserPreview;
  lastMessage: Message;
  unreadCount: number;
}

export interface ConversationPreview {
  id: string;
  otherUser: UserPreview;
  lastMessage: Message;
  unreadCount: number;
  lastMessageAt: string;
}

// ============================================================
// USER TYPES
// ============================================================

export interface UserPreview {
  id: string;
  username: string;
  profile: {
    displayName: string;
    avatarUrl?: string;
    isVerified: boolean;
  };
}

// ============================================================
// TYPING INDICATOR TYPES
// ============================================================

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  timestamp: string;
}

// ============================================================
// WEBSOCKET EVENT TYPES
// ============================================================

export enum WebSocketEvent {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  
  // Messages
  MESSAGE_SEND = 'message:send',
  MESSAGE_RECEIVE = 'message:receive',
  MESSAGE_DELIVERED = 'message:delivered',
  MESSAGE_READ = 'message:read',
  MESSAGE_BULK_READ = 'message:bulk_read',
  
  // Typing
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
  TYPING_INDICATOR = 'typing:indicator',
  
  // Conversations
  CONVERSATION_CREATED = 'conversation:created',
  CONVERSATION_UPDATED = 'conversation:updated',
  
  // Search
  MESSAGE_SEARCH = 'message:search',
  
  // Errors
  ERROR = 'error',
}

// ============================================================
// REQUEST/RESPONSE TYPES
// ============================================================

export interface SendMessageRequest {
  conversationId?: string;
  recipientId?: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  type: MessageType;
  metadata?: Record<string, any>;
}

export interface SendMessageResponse {
  message: MessageWithSender;
  conversation: ConversationWithDetails;
}

export interface MarkAsReadRequest {
  conversationId: string;
  messageIds?: string[];
}

export interface MarkAsReadResponse {
  updatedCount: number;
  conversation: ConversationWithDetails;
}

export interface SearchMessagesRequest {
  conversationId: string;
  query: string;
  page?: number;
  limit?: number;
}

export interface SearchMessagesResponse {
  messages: MessageWithSender[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface GetConversationsRequest {
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetConversationsResponse {
  conversations: ConversationPreview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface GetMessagesRequest {
  conversationId: string;
  page?: number;
  limit?: number;
  before?: string; // messageId
  after?: string; // messageId
}

export interface GetMessagesResponse {
  messages: MessageWithSender[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
}

export interface CreateConversationRequest {
  participantId: string;
  initialMessage?: string;
}

export interface CreateConversationResponse {
  conversation: ConversationWithDetails;
  message?: MessageWithSender;
}

export interface DeleteMessageRequest {
  messageId: string;
  conversationId: string;
}

export interface DeleteConversationRequest {
  conversationId: string;
}

export interface GetUnreadCountRequest {
  userId: string;
}

export interface GetUnreadCountResponse {
  totalUnread: number;
  conversationCounts: Array<{
    conversationId: string;
    unreadCount: number;
  }>;
}

// ============================================================
// MEDIA UPLOAD TYPES
// ============================================================

export interface MediaUploadRequest {
  file: File | Buffer;
  conversationId: string;
  type: MessageType;
}

export interface MediaUploadResponse {
  url: string;
  mediaType: string;
  fileName: string;
  fileSize: number;
}

// ============================================================
// ERROR TYPES
// ============================================================

export interface MessageError {
  code: string;
  message: string;
  details?: any;
}

export enum MessageErrorCode {
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  BLOCKED_USER = 'BLOCKED_USER',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
}

// ============================================================
// VALIDATION CONSTANTS
// ============================================================

export const MESSAGE_CONSTRAINTS = {
  MAX_TEXT_LENGTH: 5000,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime', 'video/webm'],
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  MAX_MESSAGES_PER_MINUTE: 60,
  TYPING_INDICATOR_TIMEOUT: 3004, // 3 seconds
  MESSAGE_DELIVERY_TIMEOUT: 30040, // 30 seconds
} as const;
