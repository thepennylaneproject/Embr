/**
 * Messaging API Client
 * HTTP client for messaging REST endpoints — uses shared apiClient (cookie-based auth)
 */

import apiClient from "@/lib/api/client";
import {
  SendMessageRequest,
  SendMessageResponse,
  MarkAsReadRequest,
  MarkAsReadResponse,
  SearchMessagesRequest,
  SearchMessagesResponse,
  GetConversationsRequest,
  GetConversationsResponse,
  GetMessagesRequest,
  GetMessagesResponse,
  CreateConversationRequest,
  CreateConversationResponse,
  DeleteMessageRequest,
  DeleteConversationRequest,
  GetUnreadCountResponse,
  MediaUploadRequest,
  MediaUploadResponse,
} from "../../shared/types/messaging.types";

const BASE = "/messaging";

export class MessagingAPIClient {
  // ============================================================
  // CONVERSATION METHODS
  // ============================================================

  async getConversations(
    params: GetConversationsRequest = {},
  ): Promise<GetConversationsResponse> {
    const { data } = await apiClient.get(`${BASE}/conversations`, { params });
    return data;
  }

  async createConversation(
    payload: CreateConversationRequest,
  ): Promise<CreateConversationResponse> {
    const { data } = await apiClient.post(`${BASE}/conversations`, payload);
    return data;
  }

  async deleteConversation(payload: DeleteConversationRequest): Promise<void> {
    await apiClient.delete(`${BASE}/conversations/${payload.conversationId}`);
  }

  // ============================================================
  // MESSAGE METHODS
  // ============================================================

  async sendMessage(payload: SendMessageRequest): Promise<SendMessageResponse> {
    const { data } = await apiClient.post(`${BASE}/messages`, payload);
    return data;
  }

  async getMessages(params: GetMessagesRequest): Promise<GetMessagesResponse> {
    const { conversationId, ...queryParams } = params;
    const { data } = await apiClient.get(
      `${BASE}/conversations/${conversationId}/messages`,
      { params: queryParams },
    );
    return data;
  }

  async markAsRead(payload: MarkAsReadRequest): Promise<MarkAsReadResponse> {
    const { data } = await apiClient.post(`${BASE}/messages/read`, payload);
    return data;
  }

  async deleteMessage(payload: DeleteMessageRequest): Promise<void> {
    await apiClient.delete(`${BASE}/messages/${payload.messageId}`, {
      params: { conversationId: payload.conversationId },
    });
  }

  async searchMessages(
    params: SearchMessagesRequest,
  ): Promise<SearchMessagesResponse> {
    const { conversationId, ...queryParams } = params;
    const { data } = await apiClient.get(
      `${BASE}/conversations/${conversationId}/search`,
      { params: queryParams },
    );
    return data;
  }

  // ============================================================
  // UNREAD COUNT METHOD
  // ============================================================

  async getUnreadCount(): Promise<GetUnreadCountResponse> {
    const { data } = await apiClient.get(`${BASE}/unread`);
    return data;
  }

  // ============================================================
  // MEDIA UPLOAD METHOD
  // ============================================================

  async uploadMedia(request: MediaUploadRequest): Promise<MediaUploadResponse> {
    const formData = new FormData();
    formData.append("file", request.file);
    formData.append("conversationId", request.conversationId);
    formData.append("type", request.type);

    const { data } = await apiClient.post(`${BASE}/media/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }
}

// Export singleton instance
export const messagingAPI = new MessagingAPIClient();
