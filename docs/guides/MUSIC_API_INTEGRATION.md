# EMBR Music API Integration Guide

Complete guide to integrating EMBR Music API into your application.

## Table of Contents

- [Authentication](#authentication)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Artist Management](#artist-management)
- [Track Discovery](#track-discovery)
- [Music Licensing](#music-licensing)
- [Usage Tracking](#usage-tracking)
- [Revenue Reporting](#revenue-reporting)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Best Practices](#best-practices)

---

## Authentication

### Bearer Token

All requests require a Bearer token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://api.embr.dev/v1/music/artists
```

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.embr.dev/v1/music',
  headers: {
    Authorization: `Bearer ${process.env.EMBR_API_TOKEN}`,
  },
});
```

### Getting Your Token

1. Go to your EMBR dashboard
2. Navigate to Settings → API Keys
3. Click "Generate New Token"
4. Store securely (never commit to version control)

---

## Quick Start

### 1. Search for Artists

```typescript
const getArtists = async (query: string) => {
  const response = await client.get('/artists', {
    params: {
      q: query,
      sort: 'trending',
      limit: 10,
    },
  });
  return response.data.data;
};

// Usage
const artists = await getArtists('lo-fi hip hop');
```

### 2. Get Artist's Tracks

```typescript
const getArtistTracks = async (artistId: string) => {
  const response = await client.get(`/artists/${artistId}/tracks`, {
    params: {
      sort: 'popular',
      limit: 20,
    },
  });
  return response.data.data;
};
```

### 3. Check Licensing Rights

```typescript
const checkLicensing = async (
  trackId: string,
  contentType: 'video' | 'audio' | 'remix'
) => {
  const response = await client.post('/licensing/check', {
    trackId,
    contentType,
  });
  return response.data.data;
};

// Usage
const licensing = await checkLicensing(
  'track-uuid-123',
  'video'
);

if (licensing.allowed) {
  console.log('✅ You can use this track!');
  console.log(`Revenue share - Creator: ${licensing.revenueShare.creator}%`);
}
```

### 4. Record Music Usage

```typescript
const recordMusicUsage = async (
  trackId: string,
  contentId: string,
  contentType: 'video' | 'audio' | 'remix'
) => {
  const response = await client.post('/licensing/record', {
    trackId,
    contentId,
    contentType,
  });
  return response.data.data;
};

// Usage
const usage = await recordMusicUsage(
  'track-uuid-123',
  'video-content-123',
  'video'
);

console.log(`License recorded: ${usage.id}`);
```

### 5. Track Streams & Engagement

```typescript
// Record a view/stream
const recordStream = async (trackId: string, contentId: string) => {
  await client.post('/usage/record-stream', {
    trackId,
    contentId,
  });
};

// Record engagement (like, share, comment)
const recordEngagement = async (
  trackId: string,
  contentId: string,
  type: 'like' | 'share' | 'comment'
) => {
  await client.post('/usage/record-engagement', {
    trackId,
    contentId,
    type,
  });
};

// Get usage analytics
const getUsageAnalytics = async (contentId: string) => {
  const response = await client.get(`/usage/content/${contentId}`);
  return response.data.data;
};
```

### 6. Get Revenue Dashboard

```typescript
const getRevenueDashboard = async (period: 'daily' | 'weekly' | 'monthly') => {
  const response = await client.get('/revenue/dashboard', {
    params: { period },
  });
  return response.data.data;
};

// Usage
const revenue = await getRevenueDashboard('monthly');

console.log(`Total Revenue: $${revenue.totalRevenue / 100}`);
console.log(`Content Using Music: ${revenue.usages}`);

revenue.topUsages.forEach((usage) => {
  console.log(
    `📊 ${usage.contentType}: $${usage.creatorShare / 100} earned`
  );
});
```

---

## Core Concepts

### Artist

A creator who publishes music on EMBR.

**Key Fields:**
- `id` - Unique identifier
- `stageName` - Display name
- `isVerified` - Badge indicating verification
- `followerCount` - Number of followers
- `trackCount` - Published tracks

**Follow/Unfollow:**
```typescript
// Follow
await client.post(`/artists/${artistId}/follow`);

// Unfollow
await client.post(`/artists/${artistId}/unfollow`);
```

### Track

A music recording with licensing and usage rights.

**Key Fields:**
- `id` - Unique identifier
- `title` - Track name
- `artistId` - Artist who created it
- `licensingModel` - Rights type (free, commercial, exclusive, restricted)
- `streams` - Total plays
- `usedInCount` - Number of content pieces using it

**Licensing Models:**
- **Free** - Use without attribution requirements
- **Commercial** - Can be monetized by creator
- **Exclusive** - Single-use license only
- **Restricted** - Not available for general use

### VideoUsage

Records when a track is used in content and tracks revenue.

**Key Fields:**
- `trackId` - Which music is used
- `contentId` - Which content uses it
- `contentType` - Video, audio, or remix
- `streams` - Accumulated views
- `totalRevenue` - Revenue generated
- `creatorShare` - Creator's portion (40%)
- `artistShare` - Artist's portion (50%)
- `platformFee` - Platform's portion (10%)

---

## Artist Management

### Search Artists

```typescript
interface ArtistSearchParams {
  q?: string;           // Search query
  verified?: boolean;   // Filter verified only
  sort?: 'followers' | 'tracks' | 'trending';
  limit?: number;       // Default 20
  offset?: number;      // Default 0
}

const searchArtists = async (params: ArtistSearchParams) => {
  const response = await client.get('/artists', { params });
  return response.data;
};
```

### Get Artist Profile

```typescript
const getArtistProfile = async (artistId: string) => {
  const response = await client.get(`/artists/${artistId}`);
  return response.data.data;
};
```

### Get Artist's Tracks

```typescript
interface ArtistTracksParams {
  sort?: 'popular' | 'recent' | 'trending';
  limit?: number;
}

const getArtistTracks = async (
  artistId: string,
  params?: ArtistTracksParams
) => {
  const response = await client.get(`/artists/${artistId}/tracks`, {
    params,
  });
  return response.data.data;
};
```

---

## Track Discovery

### Search Tracks

```typescript
interface TrackSearchParams {
  q?: string;              // Title, artist, genre
  genre?: string;          // Music genre
  mood?: string;           // happy, sad, energetic, calm
  licensing?: 'free' | 'commercial' | 'exclusive';
  sort?: 'trending' | 'popular' | 'recent';
  limit?: number;
  offset?: number;
}

const searchTracks = async (params: TrackSearchParams) => {
  const response = await client.get('/tracks', { params });
  return {
    tracks: response.data.data,
    total: response.data.total,
  };
};

// Example: Find trending electronic music
const trending = await searchTracks({
  genre: 'electronic',
  sort: 'trending',
  limit: 10,
});
```

### Get Track Details

```typescript
const getTrackDetails = async (trackId: string) => {
  const response = await client.get(`/tracks/${trackId}`);
  return response.data.data;
};
```

### Like/Unlike Tracks

```typescript
const likeTrack = async (trackId: string) => {
  const response = await client.post(`/tracks/${trackId}/like`);
  return response.data;
};

const unlikeTrack = async (trackId: string) => {
  await client.post(`/tracks/${trackId}/unlike`);
};
```

---

## Music Licensing

### Check Licensing Rights

Before using music, always check if you're allowed to:

```typescript
interface LicensingCheck {
  trackId: string;
  contentType: 'video' | 'audio' | 'remix';
}

const checkLicensing = async (params: LicensingCheck) => {
  const response = await client.post('/licensing/check', params);
  return response.data.data;
};

// Usage
const licensing = await checkLicensing({
  trackId: 'abc-123',
  contentType: 'video',
});

// Check permissions
if (!licensing.allowed) {
  console.log(`❌ Cannot use: ${licensing.reason}`);
  return;
}

console.log(`✅ Allowed`);
console.log(`Can Remix: ${licensing.allowRemix}`);
console.log(`Can Monetize: ${licensing.allowMonetize}`);
console.log(`Attribution Required: ${licensing.attributionRequired}`);

if (licensing.attributionRequired) {
  console.log(`Must credit: ${getTrackDetails(licensing.trackId).artist.stageName}`);
}
```

### Record License Usage

Once licensed, record the usage to enable revenue tracking:

```typescript
interface LicenseRecord {
  trackId: string;
  contentId: string;
  contentType: 'video' | 'audio' | 'remix';
  attribution?: string;  // Required if attributionRequired is true
}

const recordLicense = async (params: LicenseRecord) => {
  const response = await client.post('/licensing/record', params);
  return response.data.data;
};

// Usage
try {
  const usage = await recordLicense({
    trackId: 'abc-123',
    contentId: 'video-456',
    contentType: 'video',
    attribution: 'Music by Lo-Fi Artist',
  });

  console.log(`✅ License recorded: ${usage.id}`);
  console.log(`Revenue Share: Creator 40%, Artist 50%, Platform 10%`);
} catch (error) {
  console.error('Failed to record license:', error);
  // Handle licensing error
}
```

---

## Usage Tracking

### Record Streams

Call this every time content is viewed/played:

```typescript
const recordStream = async (
  trackId: string,
  contentId: string
) => {
  await client.post('/usage/record-stream', {
    trackId,
    contentId,
  });
};

// Example: Track video view
const handleVideoPlay = async (trackId: string, videoId: string) => {
  await recordStream(trackId, videoId);
};
```

### Record Engagement

Track user interactions:

```typescript
const recordEngagement = async (
  trackId: string,
  contentId: string,
  type: 'like' | 'share' | 'comment'
) => {
  await client.post('/usage/record-engagement', {
    trackId,
    contentId,
    type,
  });
};

// Examples
await recordEngagement(trackId, videoId, 'like');
await recordEngagement(trackId, videoId, 'share');
await recordEngagement(trackId, videoId, 'comment');
```

### Get Usage Analytics

```typescript
const getAnalytics = async (contentId: string) => {
  const response = await client.get(`/usage/content/${contentId}`);
  return response.data.data;
};

// Usage
const usageData = await getAnalytics('video-123');

usageData.forEach((usage) => {
  console.log(`
    Track: ${usage.track.title}
    Streams: ${usage.streams}
    Engagements: ${usage.engagements}
    Revenue: $${usage.totalRevenue / 100}
    Your Share: $${usage.creatorShare / 100}
  `);
});
```

---

## Revenue Reporting

### Get Revenue Dashboard

```typescript
const getRevenue = async (period: 'daily' | 'weekly' | 'monthly') => {
  const response = await client.get('/revenue/dashboard', {
    params: { period },
  });
  return response.data.data;
};

// Usage
const monthlyRevenue = await getRevenue('monthly');

console.log(`
  Period: ${monthlyRevenue.period}
  Total Revenue: $${monthlyRevenue.totalRevenue / 100}
  Content Using Music: ${monthlyRevenue.usages}
  Top Earners: ${monthlyRevenue.topUsages.length}
`);
```

### Get Revenue by Track

```typescript
interface RevenueByTrackParams {
  period?: 'daily' | 'weekly' | 'monthly';
  sort?: 'revenue' | 'streams' | 'engagements';
}

const getRevenueByTrack = async (params?: RevenueByTrackParams) => {
  const response = await client.get('/revenue/tracks', { params });
  return response.data.data;
};

// Usage
const topTracks = await getRevenueByTrack({
  period: 'monthly',
  sort: 'revenue',
});

topTracks.forEach((item) => {
  console.log(`
    🎵 ${item.track.title}
    Revenue: $${item.revenue / 100}
    Streams: ${item.streams}
    Engagements: ${item.engagements}
  `);
});
```

### Get Payout History

```typescript
interface PayoutParams {
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  limit?: number;
}

const getPayoutHistory = async (params?: PayoutParams) => {
  const response = await client.get('/revenue/payouts', { params });
  return response.data.data;
};

// Usage
const completedPayouts = await getPayoutHistory({
  status: 'completed',
  limit: 10,
});

completedPayouts.forEach((payout) => {
  console.log(`
    Amount: $${payout.amount / 100}
    Status: ${payout.status}
    Date: ${new Date(payout.createdAt).toLocaleDateString()}
  `);
});
```

---

## Error Handling

### Standard Error Response

```typescript
interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Example errors:
// - UNAUTHORIZED: Invalid/missing token
// - NOT_FOUND: Track/artist doesn't exist
// - LICENSE_NOT_AVAILABLE: Can't use this track
// - RATE_LIMITED: Too many requests
```

### Handle Errors

```typescript
try {
  const result = await recordLicense({
    trackId,
    contentId,
    contentType,
  });
} catch (error) {
  if (error.response?.data?.code === 'LICENSE_NOT_AVAILABLE') {
    console.log('❌ Track not available for licensing');
    console.log(`Reason: ${error.response.data.message}`);
    // Show user why they can't use this track
  } else if (error.response?.data?.code === 'UNAUTHORIZED') {
    console.log('❌ Invalid API token');
    // Refresh token or re-authenticate
  } else if (error.response?.data?.code === 'RATE_LIMITED') {
    console.log('⚠️ Rate limit exceeded, retry after 60 seconds');
    // Implement exponential backoff
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Rate Limiting

API requests are rate limited:

- **Free tier**: 100 requests/minute
- **Pro tier**: 1,000 requests/minute
- **Enterprise**: Custom limits

Check rate limit headers:

```typescript
const makeRequest = async () => {
  const response = await client.get('/tracks');

  console.log('Rate Limit:', {
    limit: response.headers['x-ratelimit-limit'],
    remaining: response.headers['x-ratelimit-remaining'],
    resetAt: response.headers['x-ratelimit-reset'],
  });
};
```

Handle rate limiting:

```typescript
const withRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limited - wait exponentially
        const wait = Math.pow(2, i) * 1000;
        console.log(`Rate limited, retrying in ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw error;
      }
    }
  }
};

// Usage
const tracks = await withRetry(() => searchTracks({ q: 'jazz' }));
```

---

## Best Practices

### 1. Cache Results

```typescript
const cache = new Map();

const getArtistCached = async (artistId: string) => {
  const key = `artist-${artistId}`;

  if (cache.has(key)) {
    return cache.get(key);
  }

  const artist = await client.get(`/artists/${artistId}`);
  cache.set(key, artist.data.data);

  // Clear cache after 1 hour
  setTimeout(() => cache.delete(key), 3600000);

  return artist.data.data;
};
```

### 2. Batch Requests

```typescript
const batchGetTracks = async (trackIds: string[]) => {
  const tracks = await Promise.all(
    trackIds.map(id => client.get(`/tracks/${id}`))
  );
  return tracks.map(r => r.data.data);
};
```

### 3. Always Check Licensing

```typescript
const useMusicSafely = async (
  trackId: string,
  contentId: string,
  contentType: 'video' | 'audio' | 'remix'
) => {
  // 1. Check if allowed
  const licensing = await checkLicensing({ trackId, contentType });

  if (!licensing.allowed) {
    throw new Error(`Cannot use track: ${licensing.reason}`);
  }

  // 2. Ensure attribution if needed
  if (licensing.attributionRequired) {
    const track = await getTrackDetails(trackId);
    addAttribution(track.artist.stageName);
  }

  // 3. Record usage
  const usage = await recordLicense({
    trackId,
    contentId,
    contentType,
    attribution: getAttributionText(),
  });

  return usage;
};
```

### 4. Monitor Revenue

```typescript
const setupRevenueMonitoring = async () => {
  // Check revenue daily
  setInterval(async () => {
    const revenue = await getRevenue('daily');

    if (revenue.totalRevenue > 0) {
      console.log(`💰 You earned $${revenue.totalRevenue / 100} today!`);
    }
  }, 24 * 60 * 60 * 1000); // Daily
};
```

### 5. Implement Offline Support

```typescript
const recordStreamWithQueue = async (trackId: string, contentId: string) => {
  try {
    await recordStream(trackId, contentId);
  } catch (error) {
    // Queue for later if offline
    queueEvent({
      type: 'stream',
      trackId,
      contentId,
      timestamp: Date.now(),
    });
  }
};

// Sync queue when back online
window.addEventListener('online', async () => {
  const queue = getEventQueue();
  for (const event of queue) {
    try {
      await recordStream(event.trackId, event.contentId);
      removeFromQueue(event);
    } catch (error) {
      console.error('Failed to sync:', error);
    }
  }
});
```

---

## Support

- 📖 [Full API Documentation](./music-api.openapi.yaml)
- 💬 [Community Discord](https://discord.gg/embr)
- 📧 [Technical Support](mailto:support@embr.dev)
- 🐛 [Report Issues](https://github.com/embr/api/issues)

---

## Examples

See `/examples` directory for complete working examples:
- React + TypeScript integration
- Node.js backend integration
- Mobile app integration
- Webhook handling
