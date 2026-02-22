# Music API - Quick Reference

Quick lookup for common API operations.

## Setup

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.embr.dev/v1/music',
  headers: {
    Authorization: `Bearer ${process.env.EMBR_API_TOKEN}`,
  },
});
```

## Artists

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Search artists | `/artists?q=...&sort=trending` | `GET` |
| Get artist | `/artists/{id}` | `GET` |
| Get artist tracks | `/artists/{id}/tracks` | `GET` |
| Follow artist | `/artists/{id}/follow` | `POST` |
| Unfollow artist | `/artists/{id}/unfollow` | `POST` |

```typescript
// Search
const artists = await api.get('/artists', {
  params: { q: 'lo-fi', sort: 'trending', limit: 10 }
});

// Get
const artist = await api.get(`/artists/${id}`);

// Tracks
const tracks = await api.get(`/artists/${id}/tracks`);

// Follow
await api.post(`/artists/${id}/follow`);
```

## Tracks

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Search tracks | `/tracks?q=...&genre=...` | `GET` |
| Get track | `/tracks/{id}` | `GET` |
| Like track | `/tracks/{id}/like` | `POST` |
| Unlike track | `/tracks/{id}/unlike` | `POST` |

```typescript
// Search
const tracks = await api.get('/tracks', {
  params: {
    q: 'chill',
    genre: 'electronic',
    licensing: 'commercial',
    limit: 20
  }
});

// Get
const track = await api.get(`/tracks/${id}`);

// Like
await api.post(`/tracks/${id}/like`);
```

## Licensing

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Check rights | `/licensing/check` | `POST` |
| Record license | `/licensing/record` | `POST` |

```typescript
// Check
const licensing = await api.post('/licensing/check', {
  trackId: 'abc-123',
  contentType: 'video'  // 'video' | 'audio' | 'remix'
});

// Record
const usage = await api.post('/licensing/record', {
  trackId: 'abc-123',
  contentId: 'video-456',
  contentType: 'video',
  attribution: 'Music by Artist Name'
});
```

## Usage Tracking

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Record stream | `/usage/record-stream` | `POST` |
| Record engagement | `/usage/record-engagement` | `POST` |
| Get analytics | `/usage/content/{id}` | `GET` |

```typescript
// Stream
await api.post('/usage/record-stream', {
  trackId: 'abc-123',
  contentId: 'video-456'
});

// Engagement
await api.post('/usage/record-engagement', {
  trackId: 'abc-123',
  contentId: 'video-456',
  type: 'like'  // 'like' | 'share' | 'comment'
});

// Analytics
const analytics = await api.get(`/usage/content/video-456`);
```

## Revenue

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Dashboard | `/revenue/dashboard?period=monthly` | `GET` |
| By track | `/revenue/tracks?sort=revenue` | `GET` |
| Payouts | `/revenue/payouts?status=completed` | `GET` |

```typescript
// Dashboard
const revenue = await api.get('/revenue/dashboard', {
  params: { period: 'monthly' }  // 'daily' | 'weekly' | 'monthly'
});

// By track
const byTrack = await api.get('/revenue/tracks', {
  params: { sort: 'revenue' }  // 'revenue' | 'streams' | 'engagements'
});

// Payouts
const payouts = await api.get('/revenue/payouts', {
  params: { status: 'completed' }  // 'pending' | 'processing' | 'completed' | 'failed'
});
```

## Error Handling

```typescript
try {
  // API call
} catch (error) {
  const code = error.response?.data?.code;
  const message = error.response?.data?.message;

  if (code === 'UNAUTHORIZED') {
    // Invalid token
  } else if (code === 'NOT_FOUND') {
    // Resource not found
  } else if (code === 'LICENSE_NOT_AVAILABLE') {
    // Can't use this track
  } else if (code === 'RATE_LIMITED') {
    // Too many requests
  }
}
```

## Common Flows

### Discover & License Music

```typescript
// 1. Search
const tracks = await api.get('/tracks', {
  params: { q: 'ambient', genre: 'electronic' }
});

// 2. Check rights
const licensing = await api.post('/licensing/check', {
  trackId: tracks.data.data[0].id,
  contentType: 'video'
});

// 3. Record if allowed
if (licensing.data.data.allowed) {
  const usage = await api.post('/licensing/record', {
    trackId: tracks.data.data[0].id,
    contentId: 'my-video',
    contentType: 'video'
  });
}
```

### Track & Monetize

```typescript
// Record view
await api.post('/usage/record-stream', {
  trackId,
  contentId
});

// Record like
await api.post('/usage/record-engagement', {
  trackId,
  contentId,
  type: 'like'
});

// Get earnings
const revenue = await api.get('/revenue/dashboard', {
  params: { period: 'monthly' }
});
```

### Follow Artists

```typescript
// Search
const artists = await api.get('/artists', {
  params: { q: 'favorite artist' }
});

// Follow
await api.post(`/artists/${artists.data.data[0].id}/follow`);

// Get their tracks
const tracks = await api.get(`/artists/${artists.data.data[0].id}/tracks`);
```

## Rate Limits

- Free: 100 req/min
- Pro: 1,000 req/min
- Enterprise: Custom

Check headers:
```typescript
const remaining = response.headers['x-ratelimit-remaining'];
const resetAt = response.headers['x-ratelimit-reset'];
```

## Licensing Models

| Model | Use | Monetize | Remix | Attribution |
|-------|-----|----------|-------|-------------|
| **free** | ✅ | ❌ | ✅ | ❌ |
| **commercial** | ✅ | ✅ | ❌ | ❌ |
| **exclusive** | ✅ | ✅ | ❌ | Optional |
| **restricted** | ❌ | ❌ | ❌ | ❌ |

## Response Examples

### Track Response
```json
{
  "id": "track-uuid",
  "title": "Ambient Dream",
  "artistId": "artist-uuid",
  "duration": 245,
  "streams": 125000,
  "downloads": 4500,
  "likeCount": 3200,
  "usedInCount": 89,
  "licensingModel": "commercial",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Licensing Info
```json
{
  "trackId": "track-uuid",
  "licensingModel": "commercial",
  "allowed": true,
  "allowRemix": false,
  "allowMonetize": true,
  "attributionRequired": false,
  "revenueShare": {
    "artist": 50,
    "creator": 40,
    "platform": 10
  }
}
```

### Revenue Data
```json
{
  "period": "monthly",
  "totalRevenue": 15250,
  "usages": 12,
  "topUsages": [
    {
      "contentId": "video-123",
      "contentType": "video",
      "streams": 5000,
      "totalRevenue": 5000,
      "creatorShare": 2000
    }
  ]
}
```

## Need Help?

- Full guide: `/docs/guides/MUSIC_API_INTEGRATION.md`
- OpenAPI spec: `/docs/api/music-api.openapi.yaml`
- Support: support@embr.dev
