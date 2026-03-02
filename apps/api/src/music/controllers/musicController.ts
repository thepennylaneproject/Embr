import { Request, Response } from 'express';
import {
  artistService,
  trackService,
  licensingService,
  revenueService,
} from '../services/musicService';

// ============================================
// ARTIST CONTROLLER
// ============================================

export const artistController = {
  // POST /api/music/artists
  async createArtist(req: Request, res: Response) {
    try {
      const { stageName, bio, profileImage } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const artist = await artistService.createArtist(userId, stageName, bio, profileImage);
      return res.status(201).json(artist);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // GET /api/music/artists/:artistId
  async getArtist(req: Request, res: Response) {
    try {
      const { artistId } = req.params;
      const artist = await artistService.getArtist(artistId);

      if (!artist) {
        return res.status(404).json({ error: 'Artist not found' });
      }

      const stats = await artistService.getArtistStats(artistId);
      return res.json({ ...artist, stats });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // PUT /api/music/artists/:artistId
  async updateArtist(req: Request, res: Response) {
    try {
      const { artistId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const data = req.body;
      const artist = await artistService.updateArtist(artistId, userId, data);
      return res.json(artist);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // GET /api/music/artists/:artistId/stats
  async getArtistStats(req: Request, res: Response) {
    try {
      const { artistId } = req.params;
      const stats = await artistService.getArtistStats(artistId);
      return res.json(stats);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};

// ============================================
// TRACK CONTROLLER
// ============================================

export const trackController = {
  // POST /api/music/tracks
  async createTrack(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get artist for this user
      const artist = await (global as any).prisma.artist.findUnique({
        where: { userId },
      });

      if (!artist) {
        return res.status(400).json({ error: 'User is not an artist' });
      }

      const track = await trackService.createTrack({
        artistId: artist.id,
        ...req.body,
      });

      return res.status(201).json(track);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // GET /api/music/tracks/:trackId
  async getTrack(req: Request, res: Response) {
    try {
      const { trackId } = req.params;
      const track = await trackService.getTrack(trackId);

      if (!track) {
        return res.status(404).json({ error: 'Track not found' });
      }

      return res.json(track);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // PUT /api/music/tracks/:trackId/publish
  async publishTrack(req: Request, res: Response) {
    try {
      const { trackId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const track = await trackService.publishTrack(trackId, userId);
      return res.json(track);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // POST /api/music/tracks/:trackId/video
  async uploadVideo(req: Request, res: Response) {
    try {
      const { trackId } = req.params;
      const { muxVideoAssetId, muxVideoPlaybackId, thumbnailUrl } = req.body;

      const track = await trackService.uploadTrackVideo(trackId, muxVideoAssetId, muxVideoPlaybackId, thumbnailUrl);
      return res.json(track);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // GET /api/music/artists/:artistId/tracks
  async getArtistTracks(req: Request, res: Response) {
    try {
      const { artistId } = req.params;
      const tracks = await trackService.getArtistTracks(artistId);
      return res.json(tracks);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // GET /api/music/search?q=query
  async searchTracks(req: Request, res: Response) {
    try {
      const { q, limit = '20' } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query parameter required' });
      }

      const tracks = await trackService.searchTracks(q, Math.min(parseInt(limit as string), 100));
      return res.json(tracks);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // PUT /api/music/tracks/:trackId/licensing
  async updateLicensing(req: Request, res: Response) {
    try {
      const { trackId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { licensingModel, allowRemix, allowMonetize, attributionRequired } = req.body;

      const track = await trackService.updateTrackLicensing(trackId, userId, {
        licensingModel,
        allowRemix,
        allowMonetize,
        attributionRequired,
      });

      return res.json(track);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};

// ============================================
// LICENSING CONTROLLER
// ============================================

export const licensingController = {
  // GET /api/music/licensing/check?trackId=X&creatorId=Y
  async checkLicensing(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { trackId, creatorId } = req.query;

      if (!trackId || !creatorId) {
        return res.status(400).json({ error: 'trackId and creatorId required' });
      }

      const result = await licensingService.checkLicensing(
        trackId as string,
        creatorId as string,
      );

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // POST /api/music/licensing/usage
  async recordUsage(req: Request, res: Response) {
    try {
      const { trackId, contentType, contentId, creatorId } = req.body;

      // Check licensing first
      const licensing = await licensingService.checkLicensing(trackId, creatorId);

      if (!licensing.allowed) {
        return res.status(403).json({ error: licensing.reason || 'Not licensed' });
      }

      const usage = await licensingService.recordUsage({
        trackId,
        contentType,
        contentId,
        creatorId,
      });

      return res.status(201).json(usage);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // GET /api/music/tracks/:trackId/usages
  async getUsageHistory(req: Request, res: Response) {
    try {
      const { trackId } = req.params;
      const { limit = '50' } = req.query;

      const usages = await licensingService.getUsageHistory(
        trackId,
        Math.min(parseInt(limit as string), 100),
      );

      return res.json(usages);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};

// ============================================
// STREAMING & REVENUE CONTROLLER
// ============================================

export const revenueController = {
  // POST /api/music/stream
  async recordStream(req: Request, res: Response) {
    try {
      const { trackId, durationPlayed, quality } = req.body;
      const userId = (req as any).user?.id;

      // Validate input
      if (!trackId) {
        return res.status(400).json({ error: 'trackId is required' });
      }

      if (!durationPlayed || typeof durationPlayed !== 'number') {
        return res.status(400).json({ error: 'durationPlayed must be a positive number' });
      }

      const play = await revenueService.recordStream(
        trackId,
        userId,
        durationPlayed,
        quality || 'standard',
      );

      return res.json(play);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Duration') || error.message.includes('Too many stream'))) {
        return res.status(429).json({ error: error.message });
      }
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // PUT /api/music/usage/:usageId/revenue
  async updateUsageRevenue(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { usageId } = req.params;
      const { impressions, engagements, totalRevenue } = req.body;

      const usage = await revenueService.updateUsageRevenue(usageId, userId, {
        impressions,
        engagements,
        totalRevenue,
      });

      return res.json(usage);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Forbidden')) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // GET /api/music/artists/:artistId/revenue
  async getArtistRevenue(req: Request, res: Response) {
    try {
      const { artistId } = req.params;
      const { period = 'monthly' } = req.query;

      const revenue = await revenueService.getArtistRevenue(
        artistId,
        (period as any) || 'monthly',
      );

      return res.json(revenue);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  // GET /api/music/creators/:creatorId/revenue
  async getCreatorRevenue(req: Request, res: Response) {
    try {
      const { creatorId } = req.params;
      const { period = 'monthly' } = req.query;

      const revenue = await revenueService.getCreatorRevenue(
        creatorId,
        (period as any) || 'monthly',
      );

      return res.json(revenue);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};
