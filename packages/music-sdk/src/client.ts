/**
 * EMBR Music SDK
 *
 * TypeScript client library for the EMBR Music API
 *
 * @example
 * ```typescript
 * // Option 1: Provide token explicitly
 * const music = new EmbrtMusicClient({
 *   token: 'your-api-token',
 *   baseURL: 'https://api.embr.dev/v1/music'
 * });
 *
 * // Option 2: Use environment variable (recommended for security)
 * // Set EMBR_MUSIC_TOKEN or MUSIC_API_TOKEN environment variable
 * const music = new EmbrtMusicClient({
 *   baseURL: 'https://api.embr.dev/v1/music'
 * });
 *
 * // Search for tracks
 * const tracks = await music.tracks.search({ q: 'ambient' });
 *
 * // Check licensing
 * const licensing = await music.licensing.check({
 *   trackId: 'abc-123',
 *   contentType: 'video'
 * });
 *
 * // Record usage
 * await music.usage.recordStream('track-id', 'content-id');
 * ```
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// ============================================================================
// Types
// ============================================================================

export interface ClientConfig {
  token?: string;
  baseURL?: string;
}

export interface Artist {
  id: string;
  stageName: string;
  bio?: string;
  avatarUrl?: string;
  isVerified: boolean;
  followerCount: number;
  trackCount: number;
  createdAt: string;
}

export interface Track {
  id: string;
  title: string;
  artistId: string;
  artist?: Artist;
  duration?: number;
  streams: number;
  downloads: number;
  likeCount: number;
  usedInCount: number;
  licensingModel: 'free' | 'commercial' | 'exclusive' | 'restricted';
  videoThumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LicensingInfo {
  trackId: string;
  licensingModel: 'free' | 'commercial' | 'exclusive' | 'restricted';
  allowed: boolean;
  reason?: string;
  allowRemix: boolean;
  allowMonetize: boolean;
  attributionRequired: boolean;
  revenueShare?: {
    artist: number;
    creator: number;
    platform: number;
  };
}

export interface VideoUsage {
  id: string;
  trackId: string;
  track?: Track;
  contentId: string;
  contentType: 'video' | 'audio' | 'remix';
  streams: number;
  downloads: number;
  engagements: number;
  totalRevenue: number;
  creatorShare: number;
  artistShare: number;
  platformFee: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorRevenue {
  period: 'daily' | 'weekly' | 'monthly';
  totalRevenue: number;
  usages: number;
  topUsages: VideoUsage[];
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export class MusicApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'MusicApiError';
  }
}

// ============================================================================
// Client
// ============================================================================

export class EmbrtMusicClient {
  private client: AxiosInstance;

  artists: ArtistsAPI;
  tracks: TracksAPI;
  licensing: LicensingAPI;
  usage: UsageAPI;
  revenue: RevenueAPI;

  constructor(config: ClientConfig) {
    // Get token from config or environment variables
    const token = config.token ||
      process.env.EMBR_MUSIC_TOKEN ||
      process.env.MUSIC_API_TOKEN;

    if (!token) {
      throw new Error(
        'Music API token is required. Provide it via config.token or set EMBR_MUSIC_TOKEN environment variable'
      );
    }

    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.embr.dev/v1/music',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Add retry interceptor for transient failures
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const config = error.config;

        // Only retry on transient failures (network errors, 429, 503, 504)
        const isTransient =
          !error.response ||
          error.response.status === 429 || // Too Many Requests
          error.response.status === 503 || // Service Unavailable
          error.response.status === 504;   // Gateway Timeout

        // Don't retry if we've already retried too many times
        const retryCount = (config as any)._retryCount || 0;
        const maxRetries = 3;

        if (isTransient && retryCount < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));

          // Mark that we're retrying
          (config as any)._retryCount = retryCount + 1;

          return this.client(config);
        }

        // Handle API errors
        const apiError = error.response?.data;
        if (apiError) {
          throw new MusicApiError(apiError.code, apiError.message, apiError.details);
        }

        throw error;
      }
    );

    // Initialize API groups
    this.artists = new ArtistsAPI(this.client);
    this.tracks = new TracksAPI(this.client);
    this.licensing = new LicensingAPI(this.client);
    this.usage = new UsageAPI(this.client);
    this.revenue = new RevenueAPI(this.client);
  }
}

// ============================================================================
// API Groups
// ============================================================================

class ArtistsAPI {
  constructor(private client: AxiosInstance) {}

  /**
   * Search for artists
   */
  async search(params: {
    q?: string;
    verified?: boolean;
    sort?: 'followers' | 'tracks' | 'trending';
    limit?: number;
    offset?: number;
  } = {}) {
    const response = await this.client.get('/artists', { params });
    return {
      artists: response.data.data as Artist[],
      total: response.data.total as number,
      limit: response.data.limit as number,
      offset: response.data.offset as number,
    };
  }

  /**
   * Get artist profile
   */
  async get(artistId: string) {
    const response = await this.client.get(`/artists/${artistId}`);
    return response.data.data as Artist;
  }

  /**
   * Get artist's tracks
   */
  async getTracks(artistId: string, params: {
    sort?: 'popular' | 'recent' | 'trending';
    limit?: number;
  } = {}) {
    const response = await this.client.get(`/artists/${artistId}/tracks`, {
      params,
    });
    return response.data.data as Track[];
  }

  /**
   * Follow an artist
   */
  async follow(artistId: string) {
    await this.client.post(`/artists/${artistId}/follow`);
  }

  /**
   * Unfollow an artist
   */
  async unfollow(artistId: string) {
    await this.client.post(`/artists/${artistId}/unfollow`);
  }
}

class TracksAPI {
  constructor(private client: AxiosInstance) {}

  /**
   * Search for tracks
   */
  async search(params: {
    q?: string;
    genre?: string;
    mood?: string;
    licensing?: 'free' | 'commercial' | 'exclusive';
    sort?: 'trending' | 'popular' | 'recent';
    limit?: number;
    offset?: number;
  } = {}) {
    const response = await this.client.get('/tracks', { params });
    return {
      tracks: response.data.data as Track[],
      total: response.data.total as number,
    };
  }

  /**
   * Get track details
   */
  async get(trackId: string) {
    const response = await this.client.get(`/tracks/${trackId}`);
    return response.data.data as Track;
  }

  /**
   * Like a track
   */
  async like(trackId: string) {
    const response = await this.client.post(`/tracks/${trackId}/like`);
    return {
      success: response.data.success,
      likeCount: response.data.likeCount,
    };
  }

  /**
   * Unlike a track
   */
  async unlike(trackId: string) {
    await this.client.post(`/tracks/${trackId}/unlike`);
  }
}

class LicensingAPI {
  constructor(private client: AxiosInstance) {}

  /**
   * Check if you can use a track
   */
  async check(params: {
    trackId: string;
    contentType: 'video' | 'audio' | 'remix';
  }) {
    const response = await this.client.post('/licensing/check', params);
    return response.data.data as LicensingInfo;
  }

  /**
   * Record music usage and create license agreement
   */
  async record(params: {
    trackId: string;
    contentId: string;
    contentType: 'video' | 'audio' | 'remix';
    attribution?: string;
  }) {
    const response = await this.client.post('/licensing/record', params);
    return {
      usage: response.data.data as VideoUsage,
      licenseId: response.data.licenseId as string,
    };
  }
}

class UsageAPI {
  constructor(private client: AxiosInstance) {}

  /**
   * Record a stream/view
   */
  async recordStream(trackId: string, contentId: string) {
    await this.client.post('/usage/record-stream', {
      trackId,
      contentId,
    });
  }

  /**
   * Record engagement (like, share, comment)
   */
  async recordEngagement(
    trackId: string,
    contentId: string,
    type: 'like' | 'share' | 'comment'
  ) {
    await this.client.post('/usage/record-engagement', {
      trackId,
      contentId,
      type,
    });
  }

  /**
   * Get usage analytics for content
   */
  async getAnalytics(contentId: string) {
    const response = await this.client.get(`/usage/content/${contentId}`);
    return response.data.data as VideoUsage[];
  }
}

class RevenueAPI {
  constructor(private client: AxiosInstance) {}

  /**
   * Get revenue dashboard
   */
  async getDashboard(period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
    const response = await this.client.get('/revenue/dashboard', {
      params: { period },
    });
    return response.data.data as CreatorRevenue;
  }

  /**
   * Get revenue breakdown by track
   */
  async getByTrack(params: {
    period?: 'daily' | 'weekly' | 'monthly';
    sort?: 'revenue' | 'streams' | 'engagements';
  } = {}) {
    const response = await this.client.get('/revenue/tracks', { params });
    return response.data.data as Array<{
      trackId: string;
      track: Track;
      revenue: number;
      streams: number;
      engagements: number;
    }>;
  }

  /**
   * Get payout history
   */
  async getPayouts(params: {
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    limit?: number;
  } = {}) {
    const response = await this.client.get('/revenue/payouts', { params });
    return response.data.data as Array<{
      id: string;
      amount: number;
      status: string;
      createdAt: string;
    }>;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default EmbrtMusicClient;
export { ArtistsAPI, TracksAPI, LicensingAPI, UsageAPI, RevenueAPI };
