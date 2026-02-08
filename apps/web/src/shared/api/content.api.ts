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
} from "@shared/types/content.types";

class ContentApiClient {
  private client: AxiosInstance;

  constructor(
    baseURL: string = process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3003/api",
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

  private mapPostTypeToApi(type: Post["type"]): string {
    switch (type) {
      case "image":
        return "IMAGE";
      case "video":
        return "VIDEO";
      default:
        return "TEXT";
    }
  }

  private mapPostTypeFromApi(type?: string): Post["type"] {
    switch ((type || "").toUpperCase()) {
      case "IMAGE":
        return "image";
      case "VIDEO":
        return "video";
      default:
        return "text";
    }
  }

  private mapVisibilityToApi(visibility?: Post["visibility"]): string | undefined {
    if (!visibility) return undefined;
    switch (visibility) {
      case "followers":
        return "FOLLOWERS";
      case "private":
        return "PRIVATE";
      default:
        return "PUBLIC";
    }
  }

  private mapVisibilityFromApi(visibility?: string): Post["visibility"] {
    switch ((visibility || "").toUpperCase()) {
      case "FOLLOWERS":
        return "followers";
      case "PRIVATE":
        return "private";
      default:
        return "public";
    }
  }

  private normalizePost(post: any): Post {
    const author = post?.author ?? {};
    const profile = author.profile ?? {};

    return {
      id: post.id,
      authorId: post.authorId ?? author.id ?? "",
      author: {
        id: author.id ?? post.authorId ?? "",
        username: author.username ?? "",
        profile: {
          displayName:
            author.displayName ??
            profile.displayName ??
            author.username ??
            "Unknown",
          avatarUrl: author.avatarUrl ?? profile.avatarUrl,
          bio: profile.bio,
        },
      },
      type: this.mapPostTypeFromApi(post.type),
      content: post.content ?? "",
      mediaUrl: post.mediaUrl ?? undefined,
      thumbnailUrl: post.thumbnailUrl ?? undefined,
      muxAssetId: post.muxAssetId ?? undefined,
      muxPlaybackId: post.muxPlaybackId ?? undefined,
      visibility: this.mapVisibilityFromApi(post.visibility),
      hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
      mentions: Array.isArray(post.mentions) ? post.mentions : [],
      viewCount: post.viewCount ?? 0,
      likeCount: post.likeCount ?? 0,
      commentCount: post.commentCount ?? 0,
      shareCount: post.shareCount ?? 0,
      duration: post.duration ?? undefined,
      isProcessing: Boolean(post.isProcessing),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isLiked: post.isLiked ?? false,
      isBookmarked: post.isBookmarked ?? false,
    };
  }

  private normalizeFeedResponse(response: FeedResponse): FeedResponse {
    return {
      ...response,
      data: response.data.map((post) => this.normalizePost(post)),
    };
  }

  private normalizeMediaResponse(media: any): MediaUploadResponse {
    return {
      mediaUrl: media?.mediaUrl ?? media?.fileUrl ?? "",
      thumbnailUrl: media?.thumbnailUrl ?? undefined,
      muxAssetId: media?.muxAssetId ?? undefined,
      muxPlaybackId: media?.muxPlaybackId ?? undefined,
      duration: media?.duration ?? undefined,
    };
  }

  // ============================================
  // POSTS
  // ============================================

  async createPost(data: CreatePostInput): Promise<Post> {
    const payload = {
      content: data.content,
      type: this.mapPostTypeToApi(data.type),
      mediaUrl: data.mediaUrl,
      thumbnailUrl: data.thumbnailUrl,
      visibility: this.mapVisibilityToApi(data.visibility),
      hashtags: data.hashtags,
    };
    const response = await this.client.post("/posts", payload);
    return this.normalizePost(response.data);
  }

  async getPost(postId: string): Promise<Post> {
    const response = await this.client.get(`/posts/${postId}`);
    return this.normalizePost(response.data);
  }

  async updatePost(postId: string, data: UpdatePostInput): Promise<Post> {
    const payload = {
      content: data.content,
      visibility: this.mapVisibilityToApi(data.visibility),
      hashtags: data.hashtags,
    };
    const response = await this.client.patch(`/posts/${postId}`, payload);
    return this.normalizePost(response.data);
  }

  async deletePost(postId: string): Promise<void> {
    await this.client.delete(`/posts/${postId}`);
  }

  async getUserPosts(
    userId: string,
    params?: { page?: number; limit?: number },
  ): Promise<PaginatedResponse<Post>> {
    const response = await this.client.get(`/posts/user/${userId}`, { params });
    return {
      ...response.data,
      data: response.data.data.map((post: Post) => this.normalizePost(post)),
    };
  }

  // ============================================
  // FEED
  // ============================================

  async getFeed(params?: FeedParams): Promise<FeedResponse> {
    const { feedType = FeedType.FOR_YOU, ...rest } = params || {};
    const endpoint =
      feedType === FeedType.FOLLOWING ? "/posts/following" : "/posts/feed";
    const response = await this.client.get(endpoint, {
      params: rest,
    });
    return this.normalizeFeedResponse(response.data);
  }

  async getForYouFeed(
    params?: Omit<FeedParams, "feedType">,
  ): Promise<FeedResponse> {
    const response = await this.client.get("/posts/feed", { params });
    return this.normalizeFeedResponse(response.data);
  }

  async getFollowingFeed(
    params?: Omit<FeedParams, "feedType">,
  ): Promise<FeedResponse> {
    const response = await this.client.get("/posts/following", { params });
    return this.normalizeFeedResponse(response.data);
  }

  async getTrendingFeed(
    params?: Omit<FeedParams, "feedType">,
  ): Promise<FeedResponse> {
    const response = await this.client.get("/posts/feed", { params });
    return this.normalizeFeedResponse(response.data);
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
    fileSize: number,
    contentType: "image" | "video",
  ): Promise<PresignedUrlResponse> {
    const response = await this.client.post("/media/upload/initiate", {
      fileName,
      fileType,
      fileSize,
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
    fileKey: string,
    fileName: string,
    contentType: "image" | "video",
  ): Promise<MediaUploadResponse> {
    const response = await this.client.post("/media/upload/complete", {
      fileKey,
      fileName,
      contentType,
    });
    const media = response.data?.media ?? response.data;
    return this.normalizeMediaResponse(media);
  }

  async uploadMedia(
    file: File,
    contentType: "image" | "video",
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<MediaUploadResponse> {
    const initResponse = await this.client.post("/media/upload/initiate", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      contentType,
    });

    const { uploadType } = initResponse.data;
    if (uploadType !== "simple") {
      throw new Error("Multipart or mux uploads are not supported in the web client yet.");
    }

    const { uploadUrl, fileKey } = initResponse.data;
    await this.uploadToS3(uploadUrl, file, onProgress);

    const completeResponse = await this.client.post("/media/upload/complete", {
      fileKey,
      fileName: file.name,
      contentType,
    });

    const media = completeResponse.data?.media ?? completeResponse.data;
    return this.normalizeMediaResponse(media);
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
