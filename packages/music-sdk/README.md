# EMBR Music SDK

Official TypeScript SDK for the EMBR Music API. Easily integrate music discovery, licensing, and monetization into your application.

## Features

- 🎵 **Music Discovery** - Search and browse artists and tracks
- 📜 **Licensing** - Check rights and record music usage
- 💰 **Revenue Tracking** - Monitor earnings from music monetization
- 📊 **Analytics** - Detailed usage and engagement metrics
- ⚡ **Type Safe** - Full TypeScript support with comprehensive types
- 🔄 **Error Handling** - Custom error types and error recovery
- 📦 **Zero Dependencies** - Built on axios only

## Installation

```bash
npm install @embr/music-sdk
# or
yarn add @embr/music-sdk
# or
pnpm add @embr/music-sdk
```

## Quick Start

```typescript
import { EmbrtMusicClient } from '@embr/music-sdk';

// Initialize client
const music = new EmbrtMusicClient({
  token: process.env.EMBR_API_TOKEN,
});

// Search for tracks
const { tracks } = await music.tracks.search({
  q: 'ambient',
  genre: 'electronic',
  limit: 10,
});

// Check licensing rights
const licensing = await music.licensing.check({
  trackId: tracks[0].id,
  contentType: 'video',
});

if (licensing.allowed) {
  // Record music usage
  const { usage } = await music.licensing.record({
    trackId: tracks[0].id,
    contentId: 'my-video-id',
    contentType: 'video',
  });

  console.log(`Licensed! Your share: $${usage.creatorShare / 100}`);
}

// Track engagement
await music.usage.recordStream(tracks[0].id, 'my-video-id');

// Check earnings
const revenue = await music.revenue.getDashboard('monthly');
console.log(`Earned: $${revenue.totalRevenue / 100}`);
```

## API Overview

### Artists

```typescript
// Search artists
const { artists } = await music.artists.search({
  q: 'favorite artist',
  sort: 'trending',
  limit: 10,
});

// Get artist profile
const artist = await music.artists.get(artistId);

// Get artist's tracks
const tracks = await music.artists.getTracks(artistId);

// Follow/Unfollow
await music.artists.follow(artistId);
await music.artists.unfollow(artistId);
```

### Tracks

```typescript
// Search tracks
const { tracks, total } = await music.tracks.search({
  q: 'ambient',
  genre: 'electronic',
  mood: 'calm',
  licensing: 'commercial',
  sort: 'trending',
  limit: 20,
});

// Get track details
const track = await music.tracks.get(trackId);

// Like/Unlike
await music.tracks.like(trackId);
await music.tracks.unlike(trackId);
```

### Licensing

```typescript
// Check if you can use a track
const licensing = await music.licensing.check({
  trackId: 'abc-123',
  contentType: 'video', // 'video' | 'audio' | 'remix'
});

if (!licensing.allowed) {
  console.log(`Cannot use: ${licensing.reason}`);
} else {
  console.log(`Revenue share - You: ${licensing.revenueShare.creator}%`);
}

// Record music usage
const { usage, licenseId } = await music.licensing.record({
  trackId: 'abc-123',
  contentId: 'my-video',
  contentType: 'video',
  attribution: 'Music by Artist Name', // Optional, required if attributionRequired is true
});

console.log(`License created: ${licenseId}`);
```

### Usage Tracking

```typescript
// Record a stream/view
await music.usage.recordStream(trackId, contentId);

// Record engagement
await music.usage.recordEngagement(trackId, contentId, 'like'); // 'like' | 'share' | 'comment'

// Get usage analytics
const analytics = await music.usage.getAnalytics(contentId);

analytics.forEach((usage) => {
  console.log(`
    Track: ${usage.track.title}
    Streams: ${usage.streams}
    Engagements: ${usage.engagements}
    Revenue: $${usage.totalRevenue / 100}
  `);
});
```

### Revenue

```typescript
// Get revenue dashboard
const revenue = await music.revenue.getDashboard('monthly');

console.log(`
  Total Revenue: $${revenue.totalRevenue / 100}
  Content Using Music: ${revenue.usages}
  Top Earners: ${revenue.topUsages.length}
`);

// Get revenue by track
const byTrack = await music.revenue.getByTrack({
  period: 'monthly',
  sort: 'revenue',
});

byTrack.forEach((item) => {
  console.log(`${item.track.title}: $${item.revenue / 100}`);
});

// Get payout history
const payouts = await music.revenue.getPayouts({
  status: 'completed',
  limit: 10,
});

payouts.forEach((payout) => {
  console.log(`$${payout.amount / 100} on ${new Date(payout.createdAt)}`);
});
```

## Error Handling

```typescript
import { EmbrtMusicClient, MusicApiError } from '@embr/music-sdk';

const music = new EmbrtMusicClient({ token: process.env.EMBR_API_TOKEN });

try {
  const licensing = await music.licensing.check({
    trackId,
    contentType: 'video',
  });
} catch (error) {
  if (error instanceof MusicApiError) {
    switch (error.code) {
      case 'UNAUTHORIZED':
        console.error('Invalid API token');
        break;
      case 'NOT_FOUND':
        console.error('Track not found');
        break;
      case 'LICENSE_NOT_AVAILABLE':
        console.error(`Cannot use: ${error.message}`);
        break;
      case 'RATE_LIMITED':
        console.error('Rate limit exceeded, retry after 60s');
        break;
      default:
        console.error(`API Error: ${error.code} - ${error.message}`);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Complete Workflow Example

```typescript
import { EmbrtMusicClient } from '@embr/music-sdk';

const music = new EmbrtMusicClient({
  token: process.env.EMBR_API_TOKEN,
});

async function useMusic(videoId: string) {
  try {
    // 1. Search for music
    console.log('🔍 Searching for ambient music...');
    const { tracks } = await music.tracks.search({
      genre: 'ambient',
      licensing: 'commercial',
      limit: 5,
    });

    const track = tracks[0];
    console.log(`Found: ${track.title} by ${track.artist?.stageName}`);

    // 2. Check licensing rights
    console.log('\n📜 Checking licensing rights...');
    const licensing = await music.licensing.check({
      trackId: track.id,
      contentType: 'video',
    });

    if (!licensing.allowed) {
      console.log(`❌ Cannot use: ${licensing.reason}`);
      return;
    }

    console.log('✅ You can use this track!');
    console.log(`   Can Monetize: ${licensing.allowMonetize}`);
    console.log(`   Attribution Required: ${licensing.attributionRequired}`);
    console.log(`   Revenue Split - You: 40%, Artist: 50%, Platform: 10%`);

    // 3. Record music usage
    console.log('\n💿 Recording license...');
    const { usage } = await music.licensing.record({
      trackId: track.id,
      contentId: videoId,
      contentType: 'video',
      attribution: licensing.attributionRequired
        ? `Music by ${track.artist?.stageName}`
        : undefined,
    });

    console.log(`✅ License recorded: ${usage.id}`);

    // 4. Simulate engagement
    console.log('\n📊 Recording views and engagement...');
    for (let i = 0; i < 5; i++) {
      await music.usage.recordStream(track.id, videoId);
      await music.usage.recordEngagement(track.id, videoId, 'like');
    }
    console.log('✅ Engagement recorded');

    // 5. Check earnings
    console.log('\n💰 Checking earnings...');
    const analytics = await music.usage.getAnalytics(videoId);
    const totalEarned = analytics.reduce((sum, a) => sum + a.creatorShare, 0);

    console.log(`You've earned: $${totalEarned / 100}`);
    console.log(`From ${analytics.length} track(s)`);

    // 6. Get revenue dashboard
    const revenue = await music.revenue.getDashboard('monthly');
    console.log(`\nMonthly Revenue: $${revenue.totalRevenue / 100}`);
    console.log(`Content Pieces: ${revenue.usages}`);

    // 7. Check payouts
    const payouts = await music.revenue.getPayouts({ status: 'completed' });
    console.log(`\nTotal Payouts: ${payouts.length}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the workflow
useMusic('my-video-id-123');
```

## Types

The SDK includes comprehensive TypeScript types:

```typescript
import {
  type Artist,
  type Track,
  type LicensingInfo,
  type VideoUsage,
  type CreatorRevenue,
  type ClientConfig,
} from '@embr/music-sdk';
```

### Key Types

```typescript
interface Track {
  id: string;
  title: string;
  artistId: string;
  artist?: Artist;
  duration?: number;
  streams: number;
  downloads: number;
  likeCount: number;
  licensingModel: 'free' | 'commercial' | 'exclusive' | 'restricted';
  createdAt: string;
}

interface LicensingInfo {
  allowed: boolean;
  allowRemix: boolean;
  allowMonetize: boolean;
  attributionRequired: boolean;
  revenueShare?: {
    artist: number;
    creator: number;
    platform: number;
  };
}

interface VideoUsage {
  id: string;
  trackId: string;
  contentId: string;
  streams: number;
  engagements: number;
  totalRevenue: number; // in cents
  creatorShare: number; // in cents
  artistShare: number;  // in cents
  platformFee: number;  // in cents
}

interface CreatorRevenue {
  period: 'daily' | 'weekly' | 'monthly';
  totalRevenue: number; // in cents
  usages: number;
  topUsages: VideoUsage[];
}
```

## Configuration

```typescript
const music = new EmbrtMusicClient({
  // Required
  token: process.env.EMBR_API_TOKEN,

  // Optional
  baseURL: 'https://api.embr.dev/v1/music', // Default
});
```

## Rate Limiting

The API has rate limits based on your plan:

- **Free**: 100 requests/minute
- **Pro**: 1,000 requests/minute
- **Enterprise**: Custom

Check remaining requests:

```typescript
// Implement retry with exponential backoff
const withRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 'RATE_LIMITED') {
        const wait = Math.pow(2, i) * 1000;
        await new Promise((r) => setTimeout(r, wait));
      } else {
        throw error;
      }
    }
  }
};

const tracks = await withRetry(() =>
  music.tracks.search({ q: 'ambient' })
);
```

## Best Practices

1. **Always check licensing before using music**
   ```typescript
   const licensing = await music.licensing.check({ trackId, contentType });
   if (!licensing.allowed) return;
   ```

2. **Cache frequently accessed data**
   ```typescript
   const cache = new Map();
   const getArtistCached = async (id) => {
     if (cache.has(id)) return cache.get(id);
     const artist = await music.artists.get(id);
     cache.set(id, artist);
     return artist;
   };
   ```

3. **Use appropriate content types**
   - `'video'` - TikTok, YouTube, Reels
   - `'audio'` - Podcasts, streaming platforms
   - `'remix'` - Samples, covers, remixes

4. **Record all engagement events**
   ```typescript
   await Promise.all([
     music.usage.recordStream(trackId, contentId),
     music.usage.recordEngagement(trackId, contentId, 'like'),
   ]);
   ```

5. **Implement proper error handling**
   ```typescript
   try {
     // API call
   } catch (error) {
     if (error instanceof MusicApiError) {
       // Handle specific API error
     } else {
       // Handle network error
     }
   }
   ```

## Support

- 📖 [Full Documentation](../../docs/guides/MUSIC_API_INTEGRATION.md)
- 🔗 [API Reference](../../docs/api/music-api.openapi.yaml)
- 💬 [Discord Community](https://discord.gg/embr)
- 📧 [Support Email](mailto:support@embr.dev)

## License

MIT
