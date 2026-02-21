# 🏗️ Spark Platform Architecture

## Overview

Spark is a **creator-owned, multi-vertical platform** built with a modular monolithic architecture. The platform is designed to support multiple content verticals (feeds, music, gigs, dating, live) while sharing a unified core for authentication, monetization, and creator tools.

---

## Technology Stack

### Backend
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL + Prisma ORM
- **API**: REST with WebSocket support (messaging)
- **Authentication**: JWT + OAuth
- **Payments**: Stripe Connect + custom Wallet
- **Media**: Mux (video), AWS S3 (storage)
- **Email**: SendGrid

### Frontend
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS + custom Embr design system
- **State Management**: React Hooks + Context API
- **Real-time**: WebSocket (messaging)
- **Build Tool**: Turbo (monorepo)

### Mobile (Future)
- **Framework**: Expo (React Native)
- **Structure**: Mirrors web app structure

---

## Directory Structure

```
embr/
│
├── apps/
│   ├── api/                              # NestJS Backend
│   │   ├── src/
│   │   │   ├── core/                    # Shared core modules
│   │   │   │   ├── auth/               # Authentication & authorization
│   │   │   │   ├── users/              # User management
│   │   │   │   ├── database/           # Prisma setup
│   │   │   │   ├── monetization/       # Wallet, transactions, payouts
│   │   │   │   ├── notifications/      # Notification system
│   │   │   │   ├── email/              # Email service
│   │   │   │   ├── media/              # Media processing
│   │   │   │   ├── upload/             # File uploads
│   │   │   │   └── safety/             # Blocking, reporting, moderation
│   │   │   │
│   │   │   ├── verticals/               # Vertical-specific business logic
│   │   │   │   ├── feeds/              # Social content (posts, comments, likes)
│   │   │   │   ├── gigs/               # Services marketplace
│   │   │   │   ├── music/              # Music streaming
│   │   │   │   ├── messaging/          # Real-time direct messages
│   │   │   │   ├── live/               # Live broadcasts (Phase 4)
│   │   │   │   └── dating/             # Dating vertical (Phase 5)
│   │   │   │
│   │   │   └── shared/                  # Cross-cutting utilities
│   │   │       ├── filters/            # Request filters
│   │   │       ├── types/              # Shared TypeScript types
│   │   │       └── utils/              # Helper utilities
│   │   │
│   │   ├── prisma/
│   │   │   └── schema.prisma           # Database schema
│   │   │
│   │   └── package.json
│   │
│   ├── web/                             # Next.js Frontend
│   │   ├── src/
│   │   │   ├── pages/                  # Route pages
│   │   │   │   ├── auth/
│   │   │   │   ├── feed/
│   │   │   │   ├── music/              # Music vertical pages
│   │   │   │   ├── gigs/
│   │   │   │   ├── profile/
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   ├── shared/             # Reusable components
│   │   │   │   ├── verticals/          # Vertical-specific components
│   │   │   │   │   ├── feeds/
│   │   │   │   │   ├── music/
│   │   │   │   │   └── gigs/
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── shared/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useUser.ts
│   │   │   │   ├── useWallet.ts
│   │   │   │   └── verticals/          # Vertical-specific hooks
│   │   │   │       ├── useMusic.ts
│   │   │   │       ├── useGigs.ts
│   │   │   │       └── useFeeds.ts
│   │   │   │
│   │   │   ├── services/               # API service layer
│   │   │   │   ├── api.ts
│   │   │   │   └── verticals/
│   │   │   │
│   │   │   ├── styles/
│   │   │   └── utils/
│   │   │
│   │   └── package.json
│   │
│   └── mobile/                          # Expo Mobile App (Phase 3+)
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   └── hooks/
│       └── package.json
│
├── packages/                            # Shared libraries
│   ├── types/                          # Shared TypeScript types
│   │   └── src/
│   │       ├── user.ts
│   │       ├── post.ts
│   │       ├── gig.ts
│   │       ├── track.ts
│   │       ├── wallet.ts
│   │       └── ...
│   │
│   ├── ui/                             # Shared UI components library
│   │   └── src/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Input.tsx
│   │       └── ...
│   │
│   ├── utils/                          # Utility functions
│   │   └── src/
│   │       ├── date.ts
│   │       ├── currency.ts
│   │       ├── validation.ts
│   │       └── ...
│   │
│   ├── config/                         # Configuration management
│   │   └── src/
│   │       ├── env.ts
│   │       ├── constants.ts
│   │       └── ...
│   │
│   ├── auth/                           # Auth utilities (NEW)
│   │   └── src/
│   │       ├── jwt.ts
│   │       ├── oauth.ts
│   │       └── ...
│   │
│   ├── monetization/                   # Creator monetization (NEW)
│   │   └── src/
│   │       ├── wallet.ts
│   │       ├── stripe.ts
│   │       ├── transactions.ts
│   │       └── ...
│   │
│   └── creator-tools/                  # Analytics & dashboards (NEW)
│       └── src/
│           ├── analytics.ts
│           ├── earnings.ts
│           └── ...
│
├── docker/                              # Docker configuration
│   └── docker-compose.yml
│
├── MISSION.md                          # Platform values & vision
├── ARCHITECTURE.md                     # This file
├── RESTRUCTURE_PLAN.md                 # Restructuring roadmap
└── package.json                        # Root workspace
```

---

## Core Module Architecture

### 1. Authentication (`core/auth/`)
Handles user authentication and authorization:

**Key Components:**
- `jwt.strategy.ts` - JWT strategy for Passport
- `jwt-auth.guard.ts` - Global JWT authentication guard
- `roles.guard.ts` - Role-based access control
- `auth.service.ts` - Auth business logic
- `auth.controller.ts` - Login, signup, password reset endpoints

**Responsibilities:**
- User login/signup
- Token generation and validation
- Password reset flows
- OAuth integration (future)
- Session management

---

### 2. User Management (`core/users/`)
Manages user profiles and user-related operations:

**Key Components:**
- `users.service.ts` - User CRUD operations
- `users.controller.ts` - User endpoints
- `profile.service.ts` - Profile management

**Responsibilities:**
- User account management
- Profile creation and updates
- User search and discovery
- User preferences and settings
- Social graph (follows, followers)

---

### 3. Monetization (`core/monetization/`)
Handles creator payments and wallet management:

**Key Components:**
- `wallet.service.ts` - Wallet balance management
- `transaction.service.ts` - Transaction tracking
- `payout.service.ts` - Payout processing
- `tip.service.ts` - Tipping system
- `stripe-connect.service.ts` - Stripe integration

**Responsibilities:**
- Wallet balance tracking
- Transaction recording
- Payout requests and processing
- Stripe Connect onboarding
- Revenue distribution (10-15% platform fee)
- Fair creator compensation

---

### 4. Media (`core/media/`)
Handles media uploads and processing:

**Key Components:**
- `media.service.ts` - Media management
- `upload.controller.ts` - Upload endpoints
- `mux.service.ts` - Mux video processing
- `s3.service.ts` - AWS S3 storage

**Responsibilities:**
- File uploads (images, videos, audio)
- Video processing with Mux
- Image thumbnails
- Storage management
- CDN delivery

---

### 5. Safety (`core/safety/`)
Handles content moderation and user safety:

**Key Components:**
- `blocking.service.ts` - User blocking
- `muting.service.ts` - User muting
- `reporting.service.ts` - Content/user reporting
- `moderation.service.ts` - Moderation actions
- `content-filter.service.ts` - Content filtering

**Responsibilities:**
- User blocking/muting
- Content reporting
- Moderation workflows
- Appeal handling
- Content filtering and review

---

### 6. Notifications (`core/notifications/`)
Handles user notifications:

**Key Components:**
- `notifications.service.ts` - Notification management
- `notifications.controller.ts` - Notification endpoints
- `notification.gateway.ts` - WebSocket for real-time

**Responsibilities:**
- Notification creation
- Notification retrieval
- Real-time delivery (WebSocket)
- Notification preferences

---

## Vertical Architecture

Each vertical (`feeds/`, `gigs/`, `music/`, etc.) follows this pattern:

```
vertical/
├── controllers/        # HTTP endpoints
├── services/          # Business logic
├── dto/               # Data transfer objects (validation)
├── entities/          # Prisma entity types
├── guards/            # Route guards (if vertical-specific)
└── vertical.module.ts # Module definition
```

### Example: Feeds Vertical

**Controllers:**
- `posts.controller.ts` - Post CRUD endpoints
- `comments.controller.ts` - Comment endpoints
- `likes.controller.ts` - Like endpoints

**Services:**
- `posts.service.ts` - Post business logic
- `feed.service.ts` - Feed algorithm/retrieval
- `comments.service.ts` - Comment logic
- `likes.service.ts` - Like logic

**DTOs:**
- `create-post.dto.ts` - Input validation
- `update-post.dto.ts` - Update validation

---

## Vertical: Music (Phase 2)

The Music vertical extends the Spark platform with:

**Key Models:**
- `Artist` - Artist profile (extends User)
- `Album` - Album grouping
- `Track` - Individual songs with audio files
- `TrackPlay` - Streaming plays (revenue tracking)
- `Playlist` - User-created playlists
- `ArtistStat` - Analytics and revenue tracking

**Key Services:**
- `artist.service.ts` - Artist management
- `track.service.ts` - Track upload/management
- `streaming.service.ts` - Stream tracking & revenue
- `music-analytics.service.ts` - Artist insights
- `audio-processing.service.ts` - Audio encoding with Mux

**Key Controllers:**
- `artist.controller.ts` - Artist endpoints
- `track.controller.ts` - Track CRUD
- `streaming.controller.ts` - Streaming/download endpoints
- `music-analytics.controller.ts` - Analytics endpoints

**Revenue Flow:**
```
User pays $1.00 to stream track
  ↓
Platform receives $1.00
  ↓
Payment processor fee: ~2.2% ($0.022)
  ↓
Remaining: $0.978
  ↓
Platform fee: 10-15% ($0.098)
  ↓
Artist receives: $0.880 (88% of original payment)
```

---

## Data Flow: A User Streams Music

1. **User initiates play**
   - Frontend calls `GET /api/music/stream/:trackId`
   - Backend validates user has access
   - Returns HLS playlist or MP3 URL from Mux

2. **Audio plays**
   - Mux handles CDN delivery
   - User can pause, skip, etc.

3. **Tracking play completion**
   - Frontend calls `POST /api/music/plays`
   - Backend records in `TrackPlay` model
   - Calculates artist royalty (86-90% of revenue after fees)

4. **Artist earnings updated**
   - `Transaction` record created
   - `Wallet.balance` increases for artist
   - Real-time analytics update

5. **Creator sees earnings**
   - `Artist Dashboard` shows real-time stats
   - Breakdown shows exactly what was earned and what platform fee was taken
   - Artist can request payout anytime

---

## Cross-Module Communication

Verticals communicate with core modules through:

1. **Direct Service Injection**
   ```typescript
   constructor(
     private walletService: WalletService,
     private notificationService: NotificationService,
     private userService: UsersService,
   ) {}
   ```

2. **Event Emitters (Future)**
   - `CreatorEarned` event
   - `ContentPublished` event
   - `StreamCompleted` event

3. **Shared Enums & Types**
   - From `packages/types/`
   - Keeps data models consistent

---

## API Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Detailed error message",
    "details": { /* validation errors */ }
  }
}
```

---

## Database Schema Highlights

### Key Principles
1. **Soft Deletes** - Content marked `deletedAt` (not hard deleted)
2. **Audit Trail** - `createdAt`, `updatedAt` timestamps
3. **Indexing** - Strategic indexes for common queries
4. **Relationships** - Cascading deletes where appropriate
5. **Normalization** - Avoid data duplication

### Creator-Focused Models
- `User` - Primary user
- `Profile` - Public profile info
- `Wallet` - Financial tracking
- `Transaction` - All money movements
- `Payout` - Withdrawal requests
- `AnalyticsEvent` - User engagement tracking

---

## Performance Considerations

1. **Database**
   - Indexes on frequently queried fields
   - Connection pooling with Prisma
   - Pagination for large datasets

2. **API**
   - Request rate limiting (global throttle guard)
   - Caching for static content
   - Lazy loading of relations

3. **Frontend**
   - Code splitting by vertical
   - Image optimization
   - Service worker for offline support (future)

---

## Security

1. **Authentication**
   - JWT tokens with expiration
   - Refresh token rotation
   - OAuth support (future)

2. **Authorization**
   - Role-based access control (RBAC)
   - Resource-level permissions
   - @Public() decorator for unprotected routes

3. **Data Protection**
   - Password hashing with bcrypt
   - Rate limiting on auth endpoints
   - CORS configuration
   - SQL injection prevention (Prisma)

4. **Content Safety**
   - User reporting system
   - Content filtering
   - Moderation workflows
   - Appeals process

---

## Deployment Architecture

```
Internet
  ↓
Nginx/Load Balancer
  ↓
┌─────────────────────┐
│   Web Frontend      │
│   (Next.js on    │
│    Vercel/Docker)   │
└─────────────────────┘

┌─────────────────────┐
│   API Server        │
│   (NestJS on     │
│    Docker/K8s)      │
└─────────────────────┘
  ↓
PostgreSQL Database
AWS S3 (Media)
Mux (Video)
SendGrid (Email)
Stripe (Payments)
```

---

## Roadmap

### Phase 1 (Current)
- Feeds vertical (social content)
- Gigs vertical (services marketplace)
- Monetization core
- User management

### Phase 2
- Music vertical (music streaming)
- Artist profiles & analytics
- Streaming with Mux

### Phase 3
- Mobile app with Expo
- Live broadcasts vertical

### Phase 4
- Marketplace vertical (products)
- Advanced analytics

### Phase 5
- Dating vertical
- AI-powered recommendations (user-controlled)

---

## Contributing

When adding new features:

1. **Determine if vertical-specific or core**
   - Vertical-specific → Add to appropriate `verticals/` folder
   - Core → Add to `core/` folder

2. **Follow module structure**
   - Controller → Service → Repository pattern
   - DTOs for request validation
   - Proper error handling

3. **Update database**
   - Add to `prisma/schema.prisma`
   - Create migration: `npm run db:migrate:dev`

4. **Test thoroughly**
   - Unit tests for services
   - E2E tests for controllers
   - Monetization changes impact creator revenue

5. **Document changes**
   - Update ARCHITECTURE.md if structure changes
   - Add API documentation
   - Document creator impact

---

## Contact & Support

For questions about architecture or onboarding:
- Check MISSION.md for platform values
- Check RESTRUCTURE_PLAN.md for implementation status
- Review this ARCHITECTURE.md for technical details

---

**Last Updated:** February 2026
**Architecture Version:** 2.0 (Multi-Vertical)
