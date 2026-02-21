/**
 * API Client for Content Operations
 * Handles posts, comments, likes, shares, and feed endpoints
 */

import axios, { AxiosInstance, AxiosProgressEvent } from "axios";
import {
  Post,
  CreatePostInput,
  UpdatePostInput,
  Comment,
  CreateCommentInput,
  UpdateCommentInput,
  FeedResponse,
  FeedParams,
  FeedType,
  PaginatedResponse,
  PresignedUrlResponse,
  MediaUploadResponse,
  UploadProgress,
} from "../types/content.types";

class ContentApiClient {
  private client: AxiosInstance;

  constructor(
    baseURL: string = process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3003",
  ) {
    this.client = axios.create({
      baseURL,
      timeout: 30040,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add auth token interceptor
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ============================================
  // POSTS
  // ============================================

  async createPost(data: CreatePostInput): Promise<Post> {
    const response = await this.client.post("/posts", data);
    return response.data;
  }

  async getPost(postId: string): Promise<Post> {
    const response = await this.client.get(`/posts/${postId}`);
    return response.data;
  }

  async updatePost(postId: string, data: UpdatePostInput): Promise<Post> {
    const response = await this.client.patch(`/posts/${postId}`, data);
    return response.data;
  }

  async deletePost(postId: string): Promise<void> {
    await this.client.delete(`/posts/${postId}`);
  }

  async getUserPosts(
    userId: string,
    params?: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<Post>> {
    const response = await this.client.get(`/posts/user/${userId}`, { params });
    return response.data;
  }

  // ============================================
  // FEED
  // ============================================

  async getFeed(params?: FeedParams): Promise<FeedResponse> {
    const { feedType = FeedType.FOR_YOU, ...rest } = params || {};
    const response = await this.client.get(`/feed/${feedType}`, {
      params: rest,
    });
    return response.data;
  }

  async getForYouFeed(
    params?: Omit<FeedParams, "feedType">,
  ): Promise<FeedResponse> {
    const response = await this.client.get("/feed/for-you", { params });
    return response.data;
  }

  async getFollowingFeed(
    params?: Omit<FeedParams, "feedType">,
  ): Promise<FeedResponse> {
    const response = await this.client.get("/feed/following", { params });
    return response.data;
  }

  async getTrendingFeed(
    params?: Omit<FeedParams, "feedType">,
  ): Promise<FeedResponse> {
    const response = await this.client.get("/feed/trending", { params });
    return response.data;
  }

  // ============================================
  // COMMENTS
  // ============================================

  async createComment(
    postId: string,
    data: CreateCommentInput,
  ): Promise<Comment> {
    const response = await this.client.post(`/posts/${postId}/comments`, data);
    return response.data;
  }

  async getComments(
    postId: string,
    params?: { page?: number; limit?: number; parentId?: string },
  ): Promise<PaginatedResponse<Comment>> {
    const response = await this.client.get(`/posts/${postId}/comments`, {
      params,
    });
    return response.data;
  }

  async getReplies(
    postId: string,
    commentId: string,
    params?: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<Comment>> {
    const response = await this.client.get(
      `/posts/${postId}/comments/${commentId}/replies`,
      { params },
    );
    return response.data;
  }

  async updateComment(
    postId: string,
    commentId: string,
    data: UpdateCommentInput,
  ): Promise<Comment> {
    const response = await this.client.patch(
      `/posts/${postId}/comments/${commentId}`,
      data,
    );
    return response.data;
  }

  async deleteComment(postId: string, commentId: string): Promise<void> {
    await this.client.delete(`/posts/${postId}/comments/${commentId}`);
  }

  // ============================================
  // ENGAGEMENT (LIKES, SHARES)
  // ============================================

  async likePost(postId: string): Promise<void> {
    await this.client.post(`/posts/${postId}/like`);
  }

  async unlikePost(postId: string): Promise<void> {
    await this.client.delete(`/posts/${postId}/like`);
  }

  async likeComment(postId: string, commentId: string): Promise<void> {
    await this.client.post(`/posts/${postId}/comments/${commentId}/like`);
  }

  async unlikeComment(postId: string, commentId: string): Promise<void> {
    await this.client.delete(`/posts/${postId}/comments/${commentId}/like`);
  }

  async sharePost(postId: string, platform?: string): Promise<void> {
    await this.client.post(`/posts/${postId}/share`, { platform });
  }

  async bookmarkPost(postId: string): Promise<void> {
    await this.client.post(`/posts/${postId}/bookmark`);
  }

  async unbookmarkPost(postId: string): Promise<void> {
    await this.client.delete(`/posts/${postId}/bookmark`);
  }

  // ============================================
  // MEDIA UPLOAD
  // ============================================

  async getPresignedUrl(
    fileName: string,
    fileType: string,
    contentType: "image" | "video",
  ): Promise<PresignedUrlResponse> {
    const response = await this.client.post("/upload/presigned-url", {
      fileName,
      fileType,
      contentType,
    });
    return response.data;
  }

  async uploadToS3(
    presignedUrl: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<void> {
    await axios.put(presignedUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage,
          });
        }
      },
    });
  }

  async completeMediaUpload(
    fileUrl: string,
    contentType: "image" | "video",
  ): Promise<MediaUploadResponse> {
    const response = await this.client.post("/upload/complete", {
      fileUrl,
      contentType,
    });
    return response.data;
  }

  async uploadMedia(
    file: File,
    contentType: "image" | "video",
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<MediaUploadResponse> {
    // Get presigned URL
    const { uploadUrl, fileUrl } = await this.getPresignedUrl(
      file.name,
      file.type,
      contentType,
    );

    // Upload to S3
    await this.uploadToS3(uploadUrl, file, onProgress);

    // Complete and process
    return await this.completeMediaUpload(fileUrl, contentType);
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async trackView(postId: string): Promise<void> {
    await this.client.post(`/posts/${postId}/view`);
  }

  async trackEngagement(postId: string, action: string): Promise<void> {
    await this.client.post(`/posts/${postId}/engagement`, { action });
  }
}

// Export singleton instance
export const contentApi = new ContentApiClient();
export default contentApi;
