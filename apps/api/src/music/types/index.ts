// ============================================
// MUSIC VERTICAL TYPES
// ============================================

export enum LicensingModel {
  RESTRICTED = 'restricted', // Original artist only
  FREE = 'free', // Can use free, no monetization
  COMMERCIAL = 'commercial', // Can use + monetize
  EXCLUSIVE = 'exclusive', // Only one creator can license
}

export interface ArtistProfile {
  id: string;
  userId: string;
  stageName: string;
  bio: string;
  profileImage: string;
  websiteUrl?: string;
  isVerified: boolean;
  verificationDate?: Date;
  totalStreams: bigint;
  followerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackMetadata {
  id: string;
  artistId: string;
  title: string;
  description?: string;
  duration: number; // seconds
  audioUrl: string;
  audioFormat: string;
  hasVideo: boolean;
  videoUrl?: string;
  videoDuration?: number;
  videoThumbnailUrl?: string;
  lyrics?: string;
  isPublished: boolean;
  visibility: 'public' | 'private' | 'followers';
  licensingModel: LicensingModel;
  allowRemix: boolean;
  allowMonetize: boolean;
  attributionRequired: boolean;
  price: number; // cents
  streams: bigint;
  downloads: number;
  likeCount: number;
  usedInCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioQuality {
  quality: 'LOW' | 'STANDARD' | 'HIGH' | 'HIRES';
  bitrate: number; // kbps
  format: string; // mp3, flac, wav
}

export interface VideoUsageRecord {
  id: string;
  trackId: string;
  contentType: string; // post, gig_video, reel, etc.
  contentId: string;
  creatorId: string;
  impressions: number;
  engagements: number;
  totalRevenue: number; // cents
  originalArtistShare: number; // cents
  creatorShare: number; // cents
  platformShare: number; // cents
  isAttributed: boolean;
  usageDate: Date;
  createdAt: Date;
}

export interface LicensingRequest {
  trackId: string;
  creatorId: string;
  contentType: string;
  contentId: string;
  licensingModel: LicensingModel;
}

export interface RevenueReport {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalRevenue: number; // cents
  streams: number;
  downloads: number;
  usages: number; // How many times track used in other content
  topUsages: VideoUsageRecord[]; // Top earning usages
}

export interface StreamingSession {
  sessionId: string;
  trackId: string;
  userId: string;
  quality: AudioQuality;
  startedAt: Date;
  duration: number; // seconds played
  royaltyAmount: number; // cents earned
}

export interface MuxUploadResponse {
  assetId: string;
  playbackId: string;
  videoUrl: string;
  thumbnailUrl?: string;
}

export interface LicensingOptions {
  model: LicensingModel;
  allowRemix: boolean;
  allowMonetize: boolean;
  attributionRequired: boolean;
  exclusiveCreator?: string; // For EXCLUSIVE licensing
  expiresAt?: Date; // Expiration for temporary licenses
}
