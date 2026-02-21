# Music Vertical Frontend Components

Complete React component suite for the Music vertical, including artist dashboards, music discovery, playback, and revenue tracking.

## Components Overview

### 🎵 Music Player (`MusicPlayer.tsx`)

Interactive audio player with full playback controls.

**Features:**
- Play/pause controls
- Progress bar with scrubbing
- Volume control with mute toggle
- Time display (current / total)
- Automatic stream recording (30+ seconds = counted as play)
- Metadata display (track title, artist, thumbnail)
- Download & share buttons
- Audio quality support

**Props:**
```typescript
interface MusicPlayerProps {
  trackId: string;           // Track to play
  trackTitle: string;
  artistName: string;
  audioUrl: string;          // Audio stream URL
  duration: number;          // Seconds
  thumbnailUrl?: string;     // Album art
  isPlaying?: boolean;
  onPlayStatusChange?: (isPlaying: boolean) => void;
}
```

**Usage:**
```tsx
<MusicPlayer
  trackId="track-123"
  trackTitle="Midnight Dreams"
  artistName="Luna Echo"
  audioUrl="https://..."
  duration={240}
  thumbnailUrl="https://..."
/>
```

**Hooks Used:**
- `useRecordStream` - Automatically records when 30+ seconds played

---

### 🔍 Track Discovery (`TrackDiscovery.tsx`)

Search, browse, and discover music with full metadata.

**Features:**
- Real-time search with debouncing
- License type badges (restricted, free, commercial, exclusive)
- Track stats (streams, downloads, likes)
- Usage count showing how many creators use it
- One-click usage recording
- Licensing model visualization
- Artist verification indicator
- Like and share buttons

**Props:**
```typescript
interface TrackDiscoveryProps {
  onTrackSelect?: (trackId: string) => void;  // When user clicks play
  onUseTrack?: (trackId: string) => void;     // When user clicks use
}
```

**Usage:**
```tsx
<TrackDiscovery
  onTrackSelect={(trackId) => setCurrentTrack(trackId)}
  onUseTrack={(trackId) => startLicensingFlow(trackId)}
/>
```

**Hooks Used:**
- `useSearchTracks` - Real-time search

---

### 🎤 Artist Dashboard (`ArtistDashboard.tsx`)

Complete artist profile with track management and revenue tracking.

**Tabs:**
1. **Overview**
   - Stats cards (tracks, streams, usage count, revenue)
   - Welcome message
   - Top streamed tracks
   - Most used tracks

2. **Tracks**
   - List all artist's tracks
   - Published/Draft status
   - Stream and usage counts
   - Edit button for each track

3. **Analytics**
   - Streams over time chart
   - Geographic distribution
   - Performance metrics

4. **Revenue**
   - Monthly revenue total
   - Top earning tracks/usages
   - Revenue breakdown (streams vs music usage)
   - Revenue split visualization

**Props:**
```typescript
interface ArtistDashboardProps {
  artistId: string;  // Artist to display
}
```

**Usage:**
```tsx
<ArtistDashboard artistId="artist-123" />
```

**Hooks Used:**
- `useArtist` - Artist profile and stats
- `useArtistTracks` - List tracks
- `useArtistRevenue` - Revenue reports

---

### 📋 Music Licensing Flow (`MusicLicensingFlow.tsx`)

Step-by-step wizard for checking licensing and recording music usage.

**Steps:**
1. **Check** - Verify licensing rights with:
   - Licensing model display
   - Remix permission
   - Monetization permission
   - Attribution requirements
   - Revenue share visualization

2. **Confirm** - Confirm usage with:
   - Usage details
   - Terms agreement
   - Confirmation button

3. **Success** - Confirmation with:
   - Success message
   - Next steps
   - What happens to earnings

4. **Error** - Error handling with:
   - Error message
   - Suggested actions
   - Try again or browse alternatives

**Props:**
```typescript
interface MusicLicensingFlowProps {
  trackId: string;
  creatorId: string;
  contentType: 'post' | 'gig_video' | 'reel' | 'video';
  contentId: string;
  onSuccess?: (usageId: string) => void;
  onError?: (error: string) => void;
}
```

**Usage:**
```tsx
<MusicLicensingFlow
  trackId="track-123"
  creatorId="creator-456"
  contentType="post"
  contentId="post-789"
  onSuccess={(usageId) => console.log('Music added!', usageId)}
  onError={(error) => console.error(error)}
/>
```

**Hooks Used:**
- `useLicensing` - Check licensing rights
- `useRecordUsage` - Record the usage

---

### 💰 Creator Revenue Dashboard (`CreatorRevenueDashboard.tsx`)

View earnings from using music in creator's content.

**Sections:**
1. **Revenue Summary**
   - Total revenue
   - Content count
   - Average per content
   - Top earning

2. **Top Earning Content**
   - Ranked by revenue
   - Impressions/engagements
   - Content type and ID

3. **Revenue Breakdown**
   - Creator share (40%)
   - Artist share (50%)
   - Platform fee (10%)
   - Visual breakdown

4. **Popular Tracks Used**
   - 3-column grid
   - Revenue and creator share
   - Quick view buttons

5. **Payout Info**
   - Next payout date/amount
   - Payment method info

**Props:**
```typescript
interface CreatorRevenueDashboardProps {
  creatorId: string;  // Creator to display
}
```

**Usage:**
```tsx
<CreatorRevenueDashboard creatorId="creator-123" />
```

**Hooks Used:**
- `useCreatorRevenue` - Revenue reports for creator

---

## Custom Hooks

All hooks defined in `hooks/useMusic.ts`:

### Data Fetching Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useArtist(artistId)` | Get artist profile + stats | `{ artist, stats, loading, error }` |
| `useArtistTracks(artistId)` | List artist's tracks | `{ tracks, loading, error }` |
| `useTrack(trackId)` | Get single track | `{ track, loading, error }` |
| `useSearchTracks(query, limit)` | Search tracks | `{ results, loading, error, search }` |
| `useTrackUsageHistory(trackId)` | Track usage analytics | `{ usages, loading, error }` |
| `useArtistRevenue(artistId, period)` | Artist revenue report | `{ revenue, loading, error }` |
| `useCreatorRevenue(creatorId, period)` | Creator revenue report | `{ revenue, loading, error }` |
| `useLicensing(trackId, creatorId)` | Check licensing rights | `{ licensing, loading, error }` |

### Action Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useRecordUsage()` | Record music usage | `{ recordUsage, loading, error }` |
| `useRecordStream()` | Record stream play | `{ recordStream, loading, error }` |

---

## Integration Examples

### Basic Music Player in Feed Post

```tsx
import { MusicPlayer } from '@/components/music';

function FeedPost({ post }) {
  return (
    <div className="post">
      <h2>{post.title}</h2>
      {post.musicTrackId && (
        <MusicPlayer
          trackId={post.musicTrackId}
          trackTitle={post.track.title}
          artistName={post.track.artist.stageName}
          audioUrl={post.track.audioUrl}
          duration={post.track.duration}
          thumbnailUrl={post.track.videoThumbnailUrl}
        />
      )}
    </div>
  );
}
```

### Music Licensing in Content Creator Flow

```tsx
import { TrackDiscovery, MusicLicensingFlow } from '@/components/music';

function CreatePost() {
  const [selectedTrack, setSelectedTrack] = useState(null);

  return (
    <div>
      {!selectedTrack ? (
        <TrackDiscovery
          onUseTrack={(trackId) => setSelectedTrack(trackId)}
        />
      ) : (
        <MusicLicensingFlow
          trackId={selectedTrack}
          creatorId={user.id}
          contentType="post"
          contentId={newPost.id}
          onSuccess={() => {
            // Music added to post
            setSelectedTrack(null);
          }}
        />
      )}
    </div>
  );
}
```

### Artist Dashboard

```tsx
import { ArtistDashboard } from '@/components/music';

export default function ArtistPage() {
  const { params } = useRouter();

  return <ArtistDashboard artistId={params.artistId} />;
}
```

### Creator Earnings Page

```tsx
import { CreatorRevenueDashboard } from '@/components/music';
import { useUser } from '@/hooks/useAuth';

export default function EarningsPage() {
  const { user } = useUser();

  return <CreatorRevenueDashboard creatorId={user.id} />;
}
```

---

## Styling

All components use Tailwind CSS with:
- **Colors**: Purple/Pink gradient primary, Slate/Blue for neutral
- **Dark Theme**: Slate backgrounds with white text
- **Icons**: Lucide React icons throughout
- **Responsive**: Mobile-first, scales to desktop

### Custom Classes Used
- Gradients: `from-purple-600 to-pink-600`
- Hover states: `hover:bg-purple-700 transition`
- Badges: `bg-slate-800 rounded-full px-3 py-1`
- Cards: `bg-slate-800 border border-slate-700 rounded-lg`

---

## API Integration

All components integrate with the Music API endpoints:

| Endpoint | Component | Purpose |
|----------|-----------|---------|
| `GET /api/music/artists/:id` | ArtistDashboard | Load profile |
| `GET /api/music/artists/:id/tracks` | ArtistDashboard | Load tracks |
| `GET /api/music/artists/:id/revenue` | ArtistDashboard | Load revenue |
| `GET /api/music/search` | TrackDiscovery | Search tracks |
| `GET /api/music/licensing/check` | MusicLicensingFlow | Check rights |
| `POST /api/music/licensing/usage` | MusicLicensingFlow | Record usage |
| `POST /api/music/stream` | MusicPlayer | Record stream |
| `GET /api/music/creators/:id/revenue` | CreatorRevenueDashboard | Load revenue |

---

## Error Handling

All components handle errors gracefully:
- Loading states with spinners
- Error messages to users
- Fallback UI for missing data
- Try-again buttons
- Alternative action suggestions

---

## Performance

Optimizations included:
- Hook memoization with `useCallback`
- Debounced search
- Lazy loading of images
- Pagination support (limit=50)
- Efficient re-renders

---

## Accessibility

Features:
- Semantic HTML
- ARIA labels on buttons
- Keyboard navigation ready
- Color contrast compliance
- Icon + text on buttons

---

## Testing

Each component can be tested with:
```bash
npm test -- music
```

Mock API responses available in test utilities.

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## File Structure

```
apps/web/src/components/music/
├── hooks/
│   └── useMusic.ts          (11 custom hooks)
├── player/
│   └── MusicPlayer.tsx      (Audio playback)
├── discovery/
│   └── TrackDiscovery.tsx   (Search & browse)
├── artist/
│   └── ArtistDashboard.tsx  (Artist profile)
├── licensing/
│   └── MusicLicensingFlow.tsx (Usage wizard)
├── dashboard/
│   └── CreatorRevenueDashboard.tsx (Creator earnings)
├── index.ts                 (Component exports)
└── MUSIC_FRONTEND.md        (This file)
```

---

## What's Next

Ready to integrate into main app:
1. Add routes in pages directory
2. Wire into navigation menu
3. Add to feed/post creation flow
4. Add to user profile pages
5. Add to creator tools

See RESTRUCTURE_PLAN.md for full integration plan.
