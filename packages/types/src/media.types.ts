/**
 * Media Types
 * Shared TypeScript types for media pipeline
 */

export enum ContentType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

export enum MediaStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled',
  ABORTED = 'aborted',
  DELETED = 'deleted',
}

export interface Media {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  contentType: ContentType;
  uploadId?: string;
  fileKey?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  playbackUrl?: string;
  duration?: number;
  aspectRatio?: string;
  status: MediaStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  deletedAt?: Date;
  user?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface InitiateUploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  contentType: ContentType;
}

export interface InitiateUploadResponse {
  uploadType: 'simple' | 'multipart' | 'mux';
  uploadId: string;
  uploadUrl?: string;
  fileKey?: string;
  expiresIn?: number;
  partSize?: number;
  totalParts?: number;
  partUrls?: { partNumber: number; url: string }[];
  assetId?: string;
}

export interface CompleteUploadRequest {
  fileKey: string;
  fileName: string;
  contentType: ContentType;
}

export interface CompleteUploadResponse {
  success: boolean;
  media: Media;
}

export interface UploadPart {
  PartNumber: number;
  ETag: string;
}

export interface CompleteMultipartUploadRequest {
  uploadId: string;
  fileKey: string;
  fileName: string;
  contentType: ContentType;
  parts: UploadPart[];
}

export interface AbortUploadRequest {
  uploadId: string;
  uploadType: 'simple' | 'multipart' | 'mux';
  fileKey?: string;
}

export interface GetSignedUrlResponse {
  signedUrl: string;
  expiresIn: number;
  expiresAt: string;
}

export interface MediaStats {
  totalFiles: number;
  totalSize: number;
  byType: {
    type: string;
    count: number;
  }[];
  byStatus: {
    status: string;
    count: number;
  }[];
}

export interface GetUserMediaRequest {
  contentType?: ContentType;
  status?: MediaStatus;
  limit?: number;
  offset?: number;
}

export interface GetUserMediaResponse {
  media: Media[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  estimatedTimeRemaining?: number;
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  time?: number; // For video thumbnails
}

export interface Thumbnail {
  thumbnailUrl: string;
  thumbnailKey: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface VideoPlaybackInfo {
  playbackId: string;
  playbackUrl: string;
  thumbnailUrl: string;
  gifUrl: string;
  mp4Urls: {
    low: string;
    medium: string;
    high: string;
  };
}

export interface MuxAssetDetails {
  assetId: string;
  playbackIds: string[];
  status: 'preparing' | 'ready' | 'errored';
  duration?: number;
  aspectRatio?: string;
  maxStoredResolution?: string;
  maxStoredFrameRate?: number;
  tracks: {
    type: string;
    maxWidth?: number;
    maxHeight?: number;
    maxFrameRate?: number;
  }[];
}

export interface MuxWebhookEvent {
  type: string;
  data: any;
  created_at: string;
  id: string;
}

// Validation constants
export const MAX_FILE_SIZE = {
  image: 10 * 1024 * 1024, // 10MB
  video: 1024 * 1024 * 1024, // 1GB
  document: 50 * 1024 * 1024, // 50MB
};

export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

export const MULTIPART_THRESHOLD = 5 * 1024 * 1024; // 5MB
export const PART_SIZE = 10 * 1024 * 1024; // 10MB
