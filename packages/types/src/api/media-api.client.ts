/**
 * Media API Client
 * Handles all media-related API requests
 */

import axios, { AxiosInstance } from 'axios';
import {
  Media,
  InitiateUploadRequest,
  InitiateUploadResponse,
  CompleteUploadRequest,
  CompleteUploadResponse,
  CompleteMultipartUploadRequest,
  AbortUploadRequest,
  GetSignedUrlResponse,
  GetUserMediaRequest,
  GetUserMediaResponse,
  MediaStats,
} from './media.types';

export class MediaApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = '/api', token?: string) {
    this.client = axios.create({
      baseURL,
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Initiate file upload
   */
  async initiateUpload(
    request: InitiateUploadRequest,
  ): Promise<InitiateUploadResponse> {
    const response = await this.client.post('/media/upload/initiate', request);
    return response.data;
  }

  /**
   * Complete simple upload
   */
  async completeUpload(
    request: CompleteUploadRequest,
  ): Promise<CompleteUploadResponse> {
    const response = await this.client.post('/media/upload/complete', request);
    return response.data;
  }

  /**
   * Complete multipart upload
   */
  async completeMultipartUpload(
    request: CompleteMultipartUploadRequest,
  ): Promise<CompleteUploadResponse> {
    const response = await this.client.post(
      '/media/upload/complete-multipart',
      request,
    );
    return response.data;
  }

  /**
   * Abort upload
   */
  async abortUpload(request: AbortUploadRequest): Promise<{ success: boolean }> {
    const response = await this.client.post('/media/upload/abort', request);
    return response.data;
  }

  /**
   * Get upload status
   */
  async getUploadStatus(uploadId: string): Promise<{
    uploadId: string;
    status: string;
    fileUrl?: string;
    thumbnailUrl?: string;
    createdAt: Date;
    completedAt?: Date;
  }> {
    const response = await this.client.get(
      `/media/upload/${uploadId}/status`,
    );
    return response.data;
  }

  /**
   * Get media by ID
   */
  async getMedia(mediaId: string): Promise<Media> {
    const response = await this.client.get(`/media/${mediaId}`);
    return response.data;
  }

  /**
   * Get user's media
   */
  async getUserMedia(
    request: GetUserMediaRequest = {},
  ): Promise<GetUserMediaResponse> {
    const response = await this.client.get('/media', { params: request });
    return response.data;
  }

  /**
   * Get signed URL for private media
   */
  async getSignedUrl(
    mediaId: string,
    expiresIn: number = 3600,
  ): Promise<GetSignedUrlResponse> {
    const response = await this.client.get(`/media/${mediaId}/signed-url`, {
      params: { expiresIn },
    });
    return response.data;
  }

  /**
   * Delete media
   */
  async deleteMedia(mediaId: string): Promise<{ success: boolean }> {
    const response = await this.client.delete(`/media/${mediaId}`);
    return response.data;
  }

  /**
   * Get media statistics
   */
  async getMediaStats(): Promise<MediaStats> {
    const response = await this.client.get('/media/stats');
    return response.data;
  }

  /**
   * Upload file to presigned URL
   */
  async uploadToPresignedUrl(
    url: string,
    file: File,
    onProgress?: (progress: {
      loaded: number;
      total: number;
      percentage: number;
    }) => void,
  ): Promise<void> {
    await axios.put(url, file, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
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

  /**
   * Upload file part to presigned URL
   */
  async uploadPartToPresignedUrl(
    url: string,
    part: Blob,
    onProgress?: (progress: {
      loaded: number;
      total: number;
      percentage: number;
    }) => void,
  ): Promise<string> {
    const response = await axios.put(url, part, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
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

    // Return ETag
    return response.headers.etag?.replace(/"/g, '') || '';
  }
}

// Export singleton instance
export const mediaApi = new MediaApiClient();
export default mediaApi;
