# 🏗️ Spark Platform Architecture Restructuring

## Overview

This document outlines the restructuring of Embr codebase to support **Spark** as a multi-vertical creator platform with music streaming as Phase 2.

---

## Current State (After Restructuring)

```
embr/
├── apps/
│   ├── api/                    # NestJS backend (monolithic → modular)
│   │   ├── src/
│   │   │   ├── core/          # Shared: auth, user, wallet
│   │   │   ├── verticals/
│   │   │   │   ├── feeds/     # Social content vertical
│   │   │   │   ├── gigs/      # Services marketplace
│   │   │   │   ├── music/     # Music streaming (Phase 2)
│   │   │   │   ├── live/      # Live broadcasts (Phase 4)
│   │   │   │   └── dating/    # Dating vertical (Phase 5)
│   │   │   └── shared/        # Shared services
│   │   └── prisma/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   │   ├── verticals/ # Vertical-specific components
│   │   │   │   └── shared/    # Shared components
│   │   │   └── hooks/
│   ├── mobile/                 # Expo mobile app (structured similarly)
│   └── admin/                  # Admin dashboard (future)
│
├── packages/                    # Shared utilities & types
│   ├── types/                  # Shared TypeScript types
│   ├── ui/                     # UI component library
│   ├── utils/                  # Utility functions
│   ├── config/                 # Configuration management
│   ├── auth/                   # Authentication logic (new)
│   ├── monetization/           # Creator monetization (new)
│   └── creator-tools/          # Analytics, dashboards (new)
│
├── MISSION.md                  # Platform values & vision
├── ARCHITECTURE.md             # Technical architecture (new)
├── VERTICALS.md               # Vertical specifications (new)
└── DATABASE_SCHEMA.md         # Database documentation (new)
```

---

## Phase 1: Restructure Core Backend (Feeds + Gigs)

### 1.1 Reorganize API Structure

**Current:**
```
apps/api/src/
├── auth/
├── users/
├── posts/
├── comments/
├── gigs/
├── wallet/
├── etc...
```

**New Structure:**
```
apps/api/src/
├── core/                       # Shared everything
│   ├── auth/                  # Authentication
│   ├── user/                  # User management
│   ├── wallet/                # Monetization core
│   ├── media/                 # Media uploads
│   ├── notifications/         # Notification system
│   ├── safety/                # Blocking, reporting, moderation
│   ├── analytics/             # Event tracking
│   └── filters/               # Content filtering
│
├── verticals/                 # Vertical-specific business logic
│   ├── feeds/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── entities/
│   │
│   ├── gigs/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── ...
│   │
│   ├── music/                 # NEW - Phase 2
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── dto/
│   │   └── entities/
│   │
│   ├── live/                  # Placeholder for Phase 4
│   └── dating/                # Placeholder for Phase 5
│
└── shared/                    # Cross-cutting concerns
    ├── middleware/
    ├── guards/
    ├── interceptors/
    └── utils/
```

### 1.2 Create Shared Packages

**New Packages:**

```
packages/
├── auth/                      # Move auth logic here
│   ├── jwt-strategy/
│   ├── oauth/
│   └── password/
│
├── monetization/              # Creator monetization
│   ├── wallet/
│   ├── transactions/
│   ├── payouts/
│   ├── tips/
│   └── stripe-integration/
│
├── creator-tools/            # Analytics & dashboards
│   ├── analytics/
│   ├── creator-dashboard/
│   └── earnings-tracking/
│
├── verticals/                 # Base classes for verticals
│   ├── base-vertical/
│   ├── monetizable/
│   └── discoverable/
│
└── constants/                 # Shared constants
    ├── enums/
    ├── validation/
    └── defaults/
```

---

## Phase 2: Music Vertical Implementation

### 2.1 Database Schema Additions

**New Entities in Prisma:**

```prisma
// ============================================
// MUSIC VERTICAL
// ============================================

enum AudioQuality {
  LOW       // 128kbps
  STANDARD  // 320kbps
  HIGH      // Lossless FLAC
  HIRES     // Hi-Res
}

model Artist {
  id                String    @id @default(uuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  stageName         String
  bio               String?
  genres            String[]
  avatarUrl         String?
  bannerUrl         String?

  spotifyId         String?
  appleMusicalId    String?

  isVerified        Boolean   @default(false)
  monthlyListeners  Int       @default(0)
  totalStreams      Long      @default(0)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  albums            Album[]
  tracks            Track[]
  playlists         Playlist[]
  stats             ArtistStat[]

  @@index([userId])
}

model Album {
  id                String    @id @default(uuid())
  artistId          String
  artist            Artist    @relation(fields: [artistId], references: [id], onDelete: Cascade)

  title             String
  description       String?
  coverUrl          String?

  releaseDate       DateTime
  genre             String
  tracks            String[]  // Order matters
  totalDuration     Int

  spotifyUri        String?

  isPublished       Boolean   @default(false)
  streams           Long      @default(0)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  tracks            Track[]

  @@index([artistId])
  @@index([releaseDate])
}

model Track {
  id                String    @id @default(uuid())
  artistId          String
  artist            Artist    @relation(fields: [artistId], references: [id], onDelete: Cascade)
  albumId           String?
  album             Album?    @relation(fields: [albumId], references: [id], onDelete: SetNull)

  title             String
  description       String?
  duration          Int       // Seconds

  // Audio files (support multiple qualities)
  audioUrl          String    // HLS playlist or MP3
  audioFormat       String    // "mp3", "flac", "hires"

  // Mux integration for streaming
  muxAssetId        String?
  muxPlaybackId     String?

  lyrics            String?

  // Pricing & Monetization
  price             Float     @default(0) // 0 = free, otherwise in USD
  isPublished       Boolean   @default(false)
  visibility        String    @default("public") // public, private, followers

  // Stats
  streams           Long      @default(0)
  downloads         Int       @default(0)
  likes             Int       @default(0)
  shares            Int       @default(0)

  spotifyUri        String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  plays             TrackPlay[]
  likes             TrackLike[]
  comments          TrackComment[]

  @@index([artistId])
  @@index([albumId])
  @@index([createdAt])
}

model TrackPlay {
  id                String    @id @default(uuid())
  trackId           String
  track             Track     @relation(fields: [trackId], references: [id], onDelete: Cascade)
  userId            String?
  user              User?     @relation(fields: [userId], references: [id], onDelete: SetNull)

  duration          Int       // How many seconds played
  quality           AudioQuality @default(STANDARD)

  // Revenue tracking
  royalty           Float     // Amount artist earned

  createdAt         DateTime  @default(now())

  @@index([trackId])
  @@index([userId])
  @@index([createdAt])
}

model TrackLike {
  id                String    @id @default(uuid())
  trackId           String
  track             Track     @relation(fields: [trackId], references: [id], onDelete: Cascade)
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt         DateTime  @default(now())

  @@unique([trackId, userId])
  @@index([userId])
}

model Playlist {
  id                String    @id @default(uuid())
  creatorId         String
  creator           Artist    @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  title             String
  description       String?
  coverUrl          String?

  isPublished       Boolean   @default(false)
  tracks            String[]  // Track IDs in order

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([creatorId])
}

model ArtistStat {
  id                String    @id @default(uuid())
  artistId          String
  artist            Artist    @relation(fields: [artistId], references: [id], onDelete: Cascade)

  date              DateTime  @default(now())
  streams           Long      @default(0)
  revenue           Float     @default(0)
  listeners         Int       @default(0)
  newFollowers      Int       @default(0)

  @@unique([artistId, date])
  @@index([artistId])
}

model TrackComment {
  id                String    @id @default(uuid())
  trackId           String
  track             Track     @relation(fields: [trackId], references: [id], onDelete: Cascade)
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  content           String
  timestamp         Int?      // Timestamp in track (for inline comments)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([trackId])
  @@index([userId])
}

// Update User model to include music relations
// Add to existing User model:
// artists       Artist?
// trackLikes    TrackLike[]
// trackComments TrackComment[]
```

### 2.2 Music API Endpoints

**Core endpoints:**

```
GET    /api/music/artists/:id               # Artist profile
GET    /api/music/artists/:id/albums        # Artist albums
GET    /api/music/artists/:id/tracks        # All artist tracks
GET    /api/music/artists/:id/stats         # Artist analytics

POST   /api/music/artists                   # Create artist profile
PATCH  /api/music/artists/:id               # Update artist profile

GET    /api/music/tracks/:id                # Track details
GET    /api/music/tracks/:id/comments       # Track comments
POST   /api/music/tracks/:id/comments       # Comment on track
POST   /api/music/tracks/:id/like           # Like track
GET    /api/music/tracks/search             # Search tracks

POST   /api/music/tracks                    # Upload track
PATCH  /api/music/tracks/:id                # Update track metadata
DELETE /api/music/tracks/:id                # Delete track
POST   /api/music/tracks/:id/publish        # Publish track

GET    /api/music/stream/:id                # Stream track (HLS/MP3)
POST   /api/music/downloads/:id             # Download track (if available)

GET    /api/music/albums/:id                # Album details
POST   /api/music/albums                    # Create album
PATCH  /api/music/albums/:id                # Update album

GET    /api/music/playlists/:id             # Playlist details
POST   /api/music/playlists                 # Create playlist
PATCH  /api/music/playlists/:id             # Update playlist

GET    /api/music/stats                     # User's listening stats
GET    /api/music/recommendations           # Personalized recommendations (user-controlled)
```

### 2.3 Music Frontend Structure

```
apps/web/src/
├── pages/music/
│   ├── index.tsx              # Music hub/discovery
│   ├── [artistId]/index.tsx   # Artist profile
│   ├── [artistId]/albums.tsx  # Artist albums
│   ├── track/[id].tsx         # Track detail page
│   ├── album/[id].tsx         # Album detail page
│   ├── upload.tsx             # Track upload
│   ├── library.tsx            # User's music library
│   ├── likes.tsx              # Liked tracks
│   ├── playlists/index.tsx    # User playlists
│   └── playlists/[id].tsx     # Playlist detail
│
├── components/music/
│   ├── MusicPlayer.tsx        # Global music player
│   ├── ArtistProfile.tsx      # Artist profile component
│   ├── TrackCard.tsx          # Track card
│   ├── AlbumCard.tsx          # Album card
│   ├── TrackUploader.tsx      # Track upload form
│   ├── PlaylistCreator.tsx    # Create playlist
│   ├── TrackComments.tsx      # Comments section
│   ├── ArtistAnalytics.tsx    # Artist dashboard
│   ├── AudioPlayer.tsx        # Audio player
│   └── MusicSearch.tsx        # Music search
│
└── hooks/
    ├── useMusic.ts            # Main music hook
    ├── useMusicPlayer.ts      # Player state
    ├── useArtist.ts           # Artist operations
    ├── useTrack.ts            # Track operations
    └── useMusicStreaming.ts   # Streaming logic
```

---

## Phase 3: Frontend Navigation Updates

### Main Navigation (All Verticals)

```
Feed | Discover | Messages | Gigs | Music | Wallet | Notifications | [Avatar ▼]

Avatar Dropdown:
├── My Profile
├── Edit Profile
├── Notification Preferences
├── Privacy Settings
├── Safety & Blocking
├── Payout Settings
└── Sign Out
```

### Music Section Sub-navigation

```
Music Hub / Discover / My Library / Likes / Playlists / Upload
```

---

## Implementation Priority

### Week 1-2: Foundation
- [ ] Add MISSION.md (Done)
- [ ] Create ARCHITECTURE.md (this file)
- [ ] Restructure backend (core/ verticals/ shared/)
- [ ] Commit to git

### Week 3-4: Database & Schema
- [ ] Add Music schema to Prisma
- [ ] Create migrations
- [ ] Update User model relations
- [ ] Add artist verification endpoints

### Week 5-6: Music API
- [ ] Artist endpoints
- [ ] Track upload/management
- [ ] Streaming integration
- [ ] Analytics

### Week 7-8: Music Frontend
- [ ] Music hub pages
- [ ] Artist profiles
- [ ] Track player
- [ ] Upload interface
- [ ] Artist dashboard

### Week 9-10: Polish & Launch
- [ ] Testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Launch Phase 2 (Music)

---

## Key Design Decisions

### 1. **Vertical Independence**
Each vertical is self-contained in `apps/api/src/verticals/` but shares core services:
- Authentication
- User management
- Wallet/monetization
- Media uploads
- Notifications
- Safety/moderation

### 2. **Creator-Centric Architecture**
Every vertical has:
- Creator profile/stats
- Analytics dashboard
- Monetization hooks
- Direct audience connection

### 3. **Transparent Monetization**
- Every transaction tracked in Wallet
- Revenue breakdown visible to creators
- Real-time analytics
- Fair payout structure (85-90% to creator)

### 4. **Modular Frontend**
- Shared components in `components/shared/`
- Vertical-specific components in `components/verticals/`
- Shared hooks in `hooks/shared/`
- Vertical hooks in `hooks/verticals/`

### 5. **Privacy First**
- Minimal data collection
- Opt-in tracking
- Creator control over analytics
- User data exports available

---

## Git Strategy

All work happens on: `claude/organize-repo-structure-TekmI`

**Commits:**
1. Restructure core backend
2. Add ARCHITECTURE.md
3. Music schema in Prisma
4. Music API endpoints
5. Music frontend structure
6. Navigation updates
7. Final polish & tests

Then **merge to main** when ready.

---

## Success Metrics

- ✅ Modular vertical architecture in place
- ✅ Music streaming phase 2 foundation built
- ✅ Creator monetization fully transparent
- ✅ API documented and tested
- ✅ Frontend supports multi-vertical navigation
- ✅ 10-15% platform fee structure implemented

