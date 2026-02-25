import { PrismaClient } from '@prisma/client';
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

  async updateArtist(artistId: string, data: Partial<ArtistProfile>) {
    return prisma.artist.update({
      where: { id: artistId },
      data,
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

  async publishTrack(trackId: string) {
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

  async updateTrackLicensing(trackId: string, data: Partial<{
    licensingModel: LicensingModel;
    allowRemix: boolean;
    allowMonetize: boolean;
    attributionRequired: boolean;
  }>) {
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
  async recordStream(trackId: string, userId: string | null, durationPlayed: number, quality: string) {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new Error('Track not found');
    }

    // Calculate royalty (simplified: $0.003 per stream, adjust to taste)
    const royaltyAmount = 0.003;

    // Record play
    const play = await prisma.trackPlay.create({
      data: {
        trackId,
        userId: userId || undefined,
        durationPlayed,
        quality: quality as any,
        royaltyAmount,
      },
    });

    // Increment stream count
    await prisma.track.update({
      where: { id: trackId },
      data: { streams: { increment: 1n } },
    });

    return play;
  },

  async updateUsageRevenue(usageId: string, data: {
    impressions: number;
    engagements: number;
    totalRevenue: number;
  }) {
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
