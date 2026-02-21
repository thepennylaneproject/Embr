/**
 * Messaging API Client
 * HTTP client for messaging REST endpoints
 */

import axios, { AxiosInstance } from "axios";
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

export class MessagingAPIClient {
  private client: AxiosInstance;

  constructor(
    baseURL: string = process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3003",
  ) {
    this.client = axios.create({
      baseURL: `${baseURL}/messaging`,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add auth token interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Add response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem("refreshToken");
            if (!refreshToken) {
              throw new Error("No refresh token");
            }

            // Call your auth refresh endpoint
            const { data } = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
              { refreshToken },
            );

            localStorage.setItem("accessToken", data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            window.location.href = "/login";
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  // ============================================================
  // CONVERSATION METHODS
  // ============================================================

  async getConversations(
    params: GetConversationsRequest = {},
  ): Promise<GetConversationsResponse> {
    const { data } = await this.client.get("/conversations", { params });
    return data;
  }

  async createConversation(
    payload: CreateConversationRequest,
  ): Promise<CreateConversationResponse> {
    const { data } = await this.client.post("/conversations", payload);
    return data;
  }

  async deleteConversation(payload: DeleteConversationRequest): Promise<void> {
    await this.client.delete(`/conversations/${payload.conversationId}`);
  }

  // ============================================================
  // MESSAGE METHODS
  // ============================================================

  async sendMessage(payload: SendMessageRequest): Promise<SendMessageResponse> {
    const { data } = await this.client.post("/messages", payload);
    return data;
  }

  async getMessages(params: GetMessagesRequest): Promise<GetMessagesResponse> {
    const { conversationId, ...queryParams } = params;
    const { data } = await this.client.get(
      `/conversations/${conversationId}/messages`,
      {
        params: queryParams,
      },
    );
    return data;
  }

  async markAsRead(payload: MarkAsReadRequest): Promise<MarkAsReadResponse> {
    const { data } = await this.client.post("/messages/read", payload);
    return data;
  }

  async deleteMessage(payload: DeleteMessageRequest): Promise<void> {
    await this.client.delete(`/messages/${payload.messageId}`, {
      params: { conversationId: payload.conversationId },
    });
  }

  async searchMessages(
    params: SearchMessagesRequest,
  ): Promise<SearchMessagesResponse> {
    const { conversationId, ...queryParams } = params;
    const { data } = await this.client.get(
      `/conversations/${conversationId}/search`,
      {
        params: queryParams,
      },
    );
    return data;
  }

  // ============================================================
  // UNREAD COUNT METHOD
  // ============================================================

  async getUnreadCount(): Promise<GetUnreadCountResponse> {
    const { data } = await this.client.get("/unread");
    return data;
  }

  // ============================================================
  // MEDIA UPLOAD METHOD
  // ============================================================

  async uploadMedia(request: MediaUploadRequest): Promise<MediaUploadResponse> {
    const formData = new FormData();

    if (request.file instanceof File) {
      formData.append("file", request.file);
    } else {
      // Convert Buffer to Blob for upload
      const blob = new Blob([request.file]);
      formData.append("file", blob);
    }

    formData.append("conversationId", request.conversationId);
    formData.append("type", request.type);

    const { data } = await this.client.post("/media/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  }
}

// Export singleton instance
export const messagingAPI = new MessagingAPIClient();
