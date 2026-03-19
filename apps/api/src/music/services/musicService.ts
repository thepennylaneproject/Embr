import { AudioQuality as PrismaAudioQuality, PrismaClient } from '@prisma/client';
import { LicensingModel, TrackMetadata, ArtistProfile, VideoUsageRecord, RevenueReport } from '../types';

const prisma = new PrismaClient();

// ============================================
// ARTIST SERVICE
// ============================================

export const artistService = {
  async createArtist(userId: string, stageName: string, bio: string, avatarUrl: string) {
    return prisma.artist.create({
      data: {
        userId,
        stageName,
        bio,
        avatarUrl,
        isVerified: false,
      },
    });
  },

  async getArtist(artistId: string) {
    return prisma.artist.findUnique({
      where: { id: artistId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  },

  async updateArtist(artistId: string, userId: string, data: Partial<ArtistProfile>) {
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
    });

    if (!artist) {
      throw new Error('Artist not found');
    }

    // Authorization: only the artist owner can update their profile
    if (artist.userId !== userId) {
      throw new Error('Forbidden: You can only update your own artist profile');
    }

    // Prevent users from modifying the isVerified flag
    const { isVerified, ...safeData } = data;

    return prisma.artist.update({
      where: { id: artistId },
      data: safeData,
    });
  },

  async verifyArtist(artistId: string) {
    return prisma.artist.update({
      where: { id: artistId },
      data: {
        isVerified: true,
      },
    });
  },

  async getArtistStats(artistId: string) {
    const tracks = await prisma.track.findMany({
      where: { artistId },
    });

    const totalStreams = tracks.reduce((sum, track) => sum + track.streams, 0n);
    const totalUsages = tracks.reduce((sum, track) => sum + BigInt(track.usedInCount), 0n);

    return {
      artistId,
      totalStreams,
      totalDownloads: tracks.reduce((sum, track) => sum + track.downloads, 0),
      totalLikes: tracks.reduce((sum, track) => sum + track.likeCount, 0),
      totalTracks: tracks.length,
      totalUsages: Number(totalUsages),
    };
  },
};

// ============================================
// TRACK SERVICE
// ============================================

export const trackService = {
  async createTrack(data: {
    artistId: string;
    albumId?: string;
    title: string;
    description?: string;
    duration: number;
    audioUrl: string;
    audioFormat: string;
    licensingModel: LicensingModel;
    price?: number;
    allowRemix: boolean;
    allowMonetize: boolean;
    attributionRequired: boolean;
  }) {
    return prisma.track.create({
      data: {
        ...data,
        isPublished: false,
      },
    });
  },

  async uploadTrackVideo(trackId: string, muxVideoAssetId: string, muxVideoPlaybackId: string, thumbnailUrl?: string) {
    return prisma.track.update({
      where: { id: trackId },
      data: {
        hasVideo: true,
        muxVideoAssetId,
        muxVideoPlaybackId,
        videoThumbnailUrl: thumbnailUrl,
      },
    });
  },

  async publishTrack(trackId: string, userId: string) {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { artist: true },
    });

    if (!track) {
      throw new Error('Track not found');
    }

    // Authorization: only the artist owner can publish
    if (track.artist.userId !== userId) {
      throw new Error('Forbidden: You can only publish your own tracks');
    }

    return prisma.track.update({
      where: { id: trackId },
      data: { isPublished: true },
    });
  },

  async getTrack(trackId: string) {
    return prisma.track.findUnique({
      where: { id: trackId },
      include: {
        artist: {
          select: {
            id: true,
            stageName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        album: true,
      },
    });
  },

  async updateTrackLicensing(trackId: string, userId: string, data: Partial<{
    licensingModel: LicensingModel;
    allowRemix: boolean;
    allowMonetize: boolean;
    attributionRequired: boolean;
  }>) {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { artist: true },
    });

    if (!track) {
      throw new Error('Track not found');
    }

    // Authorization: only the artist owner can update licensing
    if (track.artist.userId !== userId) {
      throw new Error('Forbidden: You can only update licensing for your own tracks');
    }

    return prisma.track.update({
      where: { id: trackId },
      data,
    });
  },

  async getArtistTracks(artistId: string, onlyPublished = true) {
    return prisma.track.findMany({
      where: {
        artistId,
        ...(onlyPublished && { isPublished: true }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        album: true,
      },
    });
  },

  async searchTracks(query: string, limit = 20) {
    return prisma.track.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { artist: { stageName: { contains: query, mode: 'insensitive' } } },
        ],
        isPublished: true,
        deletedAt: null,
      },
      take: limit,
      orderBy: { streams: 'desc' },
      include: {
        artist: true,
      },
    });
  },
};

// ============================================
// LICENSING SERVICE
// ============================================

export const licensingService = {
  async checkLicensing(trackId: string, creatorId: string): Promise<{
    allowed: boolean;
    reason?: string;
    licensingModel: LicensingModel;
    allowRemix: boolean;
    allowMonetize: boolean;
    attributionRequired: boolean;
  }> {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track || !track.isPublished) {
      return { allowed: false, reason: 'Track not found or not published', licensingModel: LicensingModel.RESTRICTED, allowRemix: false, allowMonetize: false, attributionRequired: true };
    }

    if (track.licensingModel === LicensingModel.RESTRICTED) {
      return {
        allowed: false,
        reason: 'Track is restricted to original artist only',
        licensingModel: LicensingModel.RESTRICTED,
        allowRemix: track.allowRemix,
        allowMonetize: track.allowMonetize,
        attributionRequired: track.attributionRequired,
      };
    }

    if (track.licensingModel === LicensingModel.EXCLUSIVE) {
      // Check if exclusive license exists for another creator
      const exclusiveLicense = await prisma.videoUsage.findFirst({
        where: {
          trackId,
          creatorId: { not: creatorId },
          contentType: 'gig_video', // Assuming gig_video is exclusive
        },
      });

      if (exclusiveLicense) {
        return {
          allowed: false,
          reason: 'Track has an exclusive license already',
          licensingModel: LicensingModel.EXCLUSIVE,
          allowRemix: track.allowRemix,
          allowMonetize: track.allowMonetize,
          attributionRequired: track.attributionRequired,
        };
      }
    }

    return {
      allowed: true,
      licensingModel: track.licensingModel as LicensingModel,
      allowRemix: track.allowRemix,
      allowMonetize: track.allowMonetize,
      attributionRequired: track.attributionRequired,
    };
  },

  async recordUsage(data: {
    trackId: string;
    contentType: string;
    contentId: string;
    creatorId: string;
  }) {
    const track = await prisma.track.findUnique({
      where: { id: data.trackId },
    });

    if (!track) {
      throw new Error('Track not found');
    }

    // Record usage
    const usage = await prisma.videoUsage.create({
      data: {
        trackId: data.trackId,
        contentType: data.contentType,
        contentId: data.contentId,
        creatorId: data.creatorId,
        licensingModel: track.licensingModel as LicensingModel,
        allowMonetize: track.allowMonetize,
        attributionUrl: `/music/artist/${track.artistId}`,
      },
    });

    // Increment usedInCount
    await prisma.track.update({
      where: { id: data.trackId },
      data: { usedInCount: { increment: 1 } },
    });

    return usage;
  },

  async getUsageHistory(trackId: string, limit = 50) {
    return prisma.videoUsage.findMany({
      where: { trackId },
      orderBy: { usageDate: 'desc' },
      take: limit,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  },
};

// ============================================
// STREAMING & REVENUE SERVICE
// ============================================

export const revenueService = {
  async recordStream(
    trackId: string,
    userId: string | null,
    durationPlayed: number,
    quality: PrismaAudioQuality,
  ) {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new Error('Track not found');
    }

    // Validate duration
    if (durationPlayed <= 0) {
      throw new Error('Duration played must be positive');
    }

    // Duration must not exceed track length (with 10% tolerance for network delays)
    const maxDuration = track.duration ? track.duration * 1.1 : durationPlayed;
    if (durationPlayed > maxDuration) {
      throw new Error('Duration played exceeds track length');
    }

    // Rate limiting: prevent same user from recording multiple streams for same track within 1 minute
    if (userId) {
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const recentPlay = await prisma.trackPlay.findFirst({
        where: {
          trackId,
          userId,
          createdAt: { gte: oneMinuteAgo },
        },
      });

      if (recentPlay) {
        throw new Error('Too many stream records for this track. Please wait before playing again.');
      }
    }

    // Only count as a stream if at least 30 seconds played
    const isValidStream = durationPlayed >= 30;

    // Store integer cents to match TrackPlay.royaltyAmount schema.
    const royaltyAmount = isValidStream ? 1 : 0;

    // Record play
    const play = await prisma.trackPlay.create({
      data: {
        trackId,
        userId: userId || undefined,
        durationPlayed,
        quality,
        royaltyAmount,
      },
    });

    // Only increment stream count if it's a valid stream (>= 30 seconds)
    if (isValidStream) {
      await prisma.track.update({
        where: { id: trackId },
        data: { streams: { increment: 1n } },
      });
    }

    return play;
  },

  async updateUsageRevenue(usageId: string, userId: string, data: {
    impressions: number;
    engagements: number;
    totalRevenue: number;
  }) {
    const usage = await prisma.videoUsage.findUnique({
      where: { id: usageId },
      include: {
        track: { include: { artist: true } },
        creator: true,
      },
    });

    if (!usage) {
      throw new Error('Usage record not found');
    }

    // Authorization: only the original artist or the creator can update revenue
    if (usage.track.artist.userId !== userId && usage.creatorId !== userId) {
      throw new Error('Forbidden: You can only update revenue for your own usage records');
    }

    // Calculate splits (50/40/10)
    const originalArtistShare = Math.floor(data.totalRevenue * 0.5);
    const creatorShare = Math.floor(data.totalRevenue * 0.4);
    const platformShare = data.totalRevenue - originalArtistShare - creatorShare;

    return prisma.videoUsage.update({
      where: { id: usageId },
      data: {
        impressions: data.impressions,
        engagements: data.engagements,
        totalRevenue: data.totalRevenue,
        originalArtistShare,
        creatorShare,
        platformShare,
      },
    });
  },

  async getArtistRevenue(artistId: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<RevenueReport> {
    const tracks = await prisma.track.findMany({
      where: { artistId },
    });

    const trackIds = tracks.map((t) => t.id);

    // Get all usages for artist's tracks
    const usages = await prisma.videoUsage.findMany({
      where: { trackId: { in: trackIds } },
      orderBy: { usageDate: 'desc' },
    });

    const totalRevenue = usages.reduce((sum, usage) => sum + usage.originalArtistShare, 0);
    const totalStreams = tracks.reduce((sum, track) => sum + track.streams, 0n);
    const totalDownloads = tracks.reduce((sum, track) => sum + track.downloads, 0);

    return {
      period,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date(),
      totalRevenue,
      streams: Number(totalStreams),
      downloads: totalDownloads,
      usages: usages.length,
      topUsages: usages.slice(0, 10),
    };
  },

  async getCreatorRevenue(creatorId: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<RevenueReport> {
    const usages = await prisma.videoUsage.findMany({
      where: { creatorId },
      orderBy: { usageDate: 'desc' },
    });

    const totalRevenue = usages.reduce((sum, usage) => sum + usage.creatorShare, 0);

    return {
      period,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      totalRevenue,
      streams: 0,
      downloads: 0,
      usages: usages.length,
      topUsages: usages.slice(0, 10),
    };
  },
};
