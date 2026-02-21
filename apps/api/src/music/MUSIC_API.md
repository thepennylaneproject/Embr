# Music Vertical API Documentation

## Overview

The Music API enables artists to upload and monetize music, and creators to use licensed music in their content with automatic revenue sharing.

## Base URL

```
https://api.embr.app/music
```

## Authentication

Most endpoints require authentication. Include bearer token in Authorization header:

```
Authorization: Bearer {access_token}
```

---

## Artist Management

### Create Artist Profile

```http
POST /api/music/artists
Authorization: Bearer {token}

{
  "stageName": "The Beatles",
  "bio": "World-famous rock band",
  "profileImage": "https://..."
}
```

**Response:**
```json
{
  "id": "artist-uuid",
  "userId": "user-uuid",
  "stageName": "The Beatles",
  "bio": "World-famous rock band",
  "profileImage": "https://...",
  "isVerified": false,
  "totalStreams": 0,
  "followerCount": 0,
  "createdAt": "2026-02-21T..."
}
```

---

### Get Artist Profile

```http
GET /api/music/artists/:artistId
```

**Response:**
```json
{
  "id": "artist-uuid",
  "stageName": "The Beatles",
  "bio": "World-famous rock band",
  "profileImage": "https://...",
  "isVerified": true,
  "stats": {
    "totalStreams": 1500000,
    "totalDownloads": 50000,
    "totalLikes": 10000,
    "totalTracks": 250,
    "totalUsages": 1200
  },
  "user": {
    "id": "user-uuid",
    "username": "thebeatles",
    "profileImage": "https://..."
  }
}
```

---

### Get Artist Stats

```http
GET /api/music/artists/:artistId/stats
```

**Response:**
```json
{
  "artistId": "artist-uuid",
  "totalStreams": 1500000,
  "totalDownloads": 50000,
  "totalLikes": 10000,
  "totalTracks": 250,
  "totalUsages": 1200
}
```

---

## Track Management

### Create Track

```http
POST /api/music/tracks
Authorization: Bearer {token}

{
  "title": "Hey Jude",
  "description": "A legendary song",
  "duration": 427,
  "audioUrl": "https://stream.embr.app/audio/...",
  "audioFormat": "mp3",
  "licensingModel": "commercial",
  "allowRemix": true,
  "allowMonetize": true,
  "attributionRequired": true
}
```

**Licensing Models:**
- `restricted` - Original artist only, cannot be used by others
- `free` - Creators can use for free, no monetization allowed
- `commercial` - Creators can use and monetize with revenue split
- `exclusive` - Only one creator can use this track

---

### Publish Track

```http
PUT /api/music/tracks/:trackId/publish
Authorization: Bearer {token}
```

Track must be published before it can be used by other creators.

---

### Upload Music Video

```http
POST /api/music/tracks/:trackId/video
Authorization: Bearer {token}

{
  "muxVideoAssetId": "mux-asset-id",
  "muxVideoPlaybackId": "mux-playback-id",
  "thumbnailUrl": "https://..."
}
```

Uploads music video through Mux integration.

---

### Get Track Details

```http
GET /api/music/tracks/:trackId
```

**Response:**
```json
{
  "id": "track-uuid",
  "title": "Hey Jude",
  "description": "A legendary song",
  "duration": 427,
  "audioUrl": "https://...",
  "audioFormat": "mp3",
  "hasVideo": true,
  "videoUrl": "https://...",
  "videoDuration": 427,
  "videoThumbnailUrl": "https://...",
  "licensingModel": "commercial",
  "allowRemix": true,
  "allowMonetize": true,
  "attributionRequired": true,
  "streams": 1500000,
  "downloads": 50000,
  "likeCount": 10000,
  "usedInCount": 1200,
  "isPublished": true,
  "artist": {
    "id": "artist-uuid",
    "stageName": "The Beatles",
    "isVerified": true
  }
}
```

---

### Search Tracks

```http
GET /api/music/search?q=hey+jude&limit=20
```

**Response:**
```json
[
  {
    "id": "track-uuid",
    "title": "Hey Jude",
    "artist": {
      "stageName": "The Beatles",
      "isVerified": true
    },
    "streams": 1500000,
    "usedInCount": 1200,
    "licensingModel": "commercial"
  }
]
```

---

### Update Track Licensing

```http
PUT /api/music/tracks/:trackId/licensing
Authorization: Bearer {token}

{
  "licensingModel": "exclusive",
  "allowRemix": false,
  "allowMonetize": true,
  "attributionRequired": true
}
```

Change licensing options for a track (affects future uses).

---

### Get Artist's Tracks

```http
GET /api/music/artists/:artistId/tracks
```

---

## Licensing & Usage

### Check Track Licensing

```http
GET /api/music/licensing/check?trackId=track-uuid&creatorId=creator-uuid
```

**Response:**
```json
{
  "allowed": true,
  "licensingModel": "commercial",
  "allowRemix": true,
  "allowMonetize": true,
  "attributionRequired": true
}
```

Or if not allowed:
```json
{
  "allowed": false,
  "reason": "Track has an exclusive license already",
  "licensingModel": "exclusive"
}
```

---

### Record Music Usage

Called by Feed/Gig APIs when creator uses music in their content.

```http
POST /api/music/licensing/usage
Authorization: Bearer {token}

{
  "trackId": "track-uuid",
  "contentType": "post",
  "contentId": "feed-post-uuid",
  "creatorId": "creator-uuid"
}
```

**Response:**
```json
{
  "id": "usage-uuid",
  "trackId": "track-uuid",
  "contentType": "post",
  "contentId": "feed-post-uuid",
  "creatorId": "creator-uuid",
  "licensingModel": "commercial",
  "impressions": 0,
  "engagements": 0,
  "totalRevenue": 0,
  "originalArtistShare": 0,
  "creatorShare": 0,
  "platformShare": 0,
  "usageDate": "2026-02-21T..."
}
```

---

### Get Track Usage History

```http
GET /api/music/tracks/:trackId/usages?limit=50
```

**Response:**
```json
[
  {
    "id": "usage-uuid",
    "contentType": "post",
    "contentId": "feed-post-uuid",
    "impressions": 5000,
    "engagements": 150,
    "totalRevenue": 25000,
    "originalArtistShare": 12500,
    "creatorShare": 10000,
    "platformShare": 2500,
    "creator": {
      "id": "creator-uuid",
      "username": "coolcreator",
      "profileImage": "https://..."
    }
  }
]
```

---

## Streaming & Revenue

### Record Stream Play

Called after user listens to music (track usage).

```http
POST /api/music/stream
Authorization: Bearer {token}

{
  "trackId": "track-uuid",
  "durationPlayed": 420,
  "quality": "high"
}
```

**Response:**
```json
{
  "id": "play-uuid",
  "trackId": "track-uuid",
  "userId": "user-uuid",
  "durationPlayed": 420,
  "quality": "HIGH",
  "royaltyAmount": 0.003,
  "createdAt": "2026-02-21T..."
}
```

---

### Update Usage Revenue

Called by monetization system to update revenue for a music usage.

```http
PUT /api/music/usage/:usageId/revenue

{
  "impressions": 5000,
  "engagements": 150,
  "totalRevenue": 25000
}
```

System automatically calculates splits:
- Original Artist: 50%
- Creator: 40%
- Platform: 10%

---

### Get Artist Revenue Report

```http
GET /api/music/artists/:artistId/revenue?period=monthly
Authorization: Bearer {token}
```

**Response:**
```json
{
  "period": "monthly",
  "startDate": "2026-01-21T...",
  "endDate": "2026-02-21T...",
  "totalRevenue": 125000,
  "streams": 500000,
  "downloads": 15000,
  "usages": 250,
  "topUsages": [
    {
      "id": "usage-uuid",
      "contentType": "post",
      "impressions": 50000,
      "totalRevenue": 25000,
      "originalArtistShare": 12500,
      "creator": {
        "username": "viral_creator"
      }
    }
  ]
}
```

---

### Get Creator Revenue Report

Revenue earned by creator from using music in their content.

```http
GET /api/music/creators/:creatorId/revenue?period=monthly
Authorization: Bearer {token}
```

**Response:**
```json
{
  "period": "monthly",
  "startDate": "2026-01-21T...",
  "endDate": "2026-02-21T...",
  "totalRevenue": 50000,
  "streams": 0,
  "downloads": 0,
  "usages": 120,
  "topUsages": [
    {
      "id": "usage-uuid",
      "totalRevenue": 500,
      "creatorShare": 200,
      "track": {
        "title": "Hey Jude",
        "artist": {
          "stageName": "The Beatles"
        }
      }
    }
  ]
}
```

---

## Integration Examples

### Using Music in a Feed Post

```typescript
// Step 1: Check if track can be used
const canUse = await fetch('/api/music/licensing/check', {
  params: { trackId, creatorId }
});

// Step 2: Create feed post with music
const post = await createFeedPost({
  content: "Check out this track!",
  musicTrackId: trackId,
  audioUrl: track.audioUrl
});

// Step 3: Record the usage
await fetch('/api/music/licensing/usage', {
  method: 'POST',
  body: {
    trackId,
    contentType: 'post',
    contentId: post.id,
    creatorId
  }
});

// Step 4: As post gets views, update revenue
setInterval(async () => {
  const impressions = await getPostImpressions(post.id);
  await fetch(`/api/music/usage/${usageId}/revenue`, {
    method: 'PUT',
    body: {
      impressions,
      engagements: post.engagements,
      totalRevenue: impressions * 0.05 // 5 cents per 100 views
    }
  });
}, 5000); // Update every 5 seconds
```

### Artist Dashboard

```typescript
// Get all artist's tracks
const tracks = await fetch('/api/music/artists/:artistId/tracks');

// Get revenue report
const revenue = await fetch('/api/music/artists/:artistId/revenue?period=monthly');

// See where music is being used
for (let track of tracks) {
  const usages = await fetch(`/api/music/tracks/${track.id}/usages?limit=10`);
  // Show which creators used this track and how much it earned
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Not authenticated"
}
```

### 403 Forbidden (Licensing)
```json
{
  "error": "Track has an exclusive license already"
}
```

### 404 Not Found
```json
{
  "error": "Track not found"
}
```

### 400 Bad Request
```json
{
  "error": "trackId and creatorId required"
}
```

### 500 Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limits

- 100 requests/minute for search
- 50 requests/minute for licensing checks
- 1000 requests/minute for streaming/revenue

---

## Webhooks (Future)

```
POST /webhooks/music-usage
POST /webhooks/track-verified
POST /webhooks/revenue-updated
```

---

## Migration Guide

### From No Music to Music Enabled

1. Create artist profile
2. Upload tracks with licensing options
3. Publish tracks
4. Frontend integrates music picker
5. When creator uses music, call licensing/usage endpoint
6. Revenue flows automatically

---

## FAQ

**Q: Can artists change licensing after publishing?**
A: Yes, but it only affects new usages. Existing usages keep their original licensing terms.

**Q: What happens to revenue if artist deletes track?**
A: Revenue is finalized. Future usages are blocked.

**Q: Can creators remix licensed music?**
A: Only if `allowRemix: true`. Remixes must include attribution.

**Q: How often is revenue calculated?**
A: Revenue updates in real-time as impressions/engagements change.

**Q: Can multiple creators license same track exclusively?**
A: No. Only one creator can have exclusive rights.

---

## Related

- [RESTRUCTURE_PLAN.md](../../RESTRUCTURE_PLAN.md) - System architecture
- [MISSION.md](../../MISSION.md) - Platform vision
- Monetization Package: `@embr/monetization`
- Creator Tools Package: `@embr/creator-tools`
