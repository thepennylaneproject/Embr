import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import {
  artistController,
  trackController,
  licensingController,
  revenueController,
} from '../controllers/musicController';

const router = Router();

// ============================================
// ARTIST ROUTES
// ============================================

// Create artist profile
router.post('/artists', requireAuth, artistController.createArtist);

// Get artist profile with stats
router.get('/artists/:artistId', artistController.getArtist);

// Update artist profile
router.put('/artists/:artistId', requireAuth, artistController.updateArtist);

// Get artist stats
router.get('/artists/:artistId/stats', artistController.getArtistStats);

// ============================================
// TRACK ROUTES
// ============================================

// Create track (upload audio)
router.post('/tracks', requireAuth, trackController.createTrack);

// Get track details
router.get('/tracks/:trackId', trackController.getTrack);

// Publish track (make it available for licensing)
router.put('/tracks/:trackId/publish', requireAuth, trackController.publishTrack);

// Upload music video
router.post('/tracks/:trackId/video', requireAuth, trackController.uploadVideo);

// Get artist's tracks
router.get('/artists/:artistId/tracks', trackController.getArtistTracks);

// Update track licensing options
router.put('/tracks/:trackId/licensing', requireAuth, trackController.updateLicensing);

// ============================================
// LICENSING & USAGE ROUTES
// ============================================

// Check if track can be licensed
router.get('/licensing/check', requireAuth, licensingController.checkLicensing);

// Record music usage in other content (called by Feed/Gig APIs)
router.post('/licensing/usage', requireAuth, licensingController.recordUsage);

// Get track usage history (who used this track)
router.get('/tracks/:trackId/usages', licensingController.getUsageHistory);

// ============================================
// STREAMING & REVENUE ROUTES
// ============================================

// Record stream play (client-side calls after listening)
router.post('/stream', requireAuth, revenueController.recordStream);

// Update revenue for a usage (called by monetization system)
router.put('/usage/:usageId/revenue', requireAuth, revenueController.updateUsageRevenue);

// Get artist's revenue report
router.get('/artists/:artistId/revenue', requireAuth, revenueController.getArtistRevenue);

// Get creator's revenue from using music
router.get('/creators/:creatorId/revenue', requireAuth, revenueController.getCreatorRevenue);

// ============================================
// SEARCH & DISCOVERY ROUTES
// ============================================

// Search for tracks
router.get('/search', trackController.searchTracks);

export default router;
