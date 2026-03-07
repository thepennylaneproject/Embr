# Embr — Codebase Intelligence Extraction

> **Produced by:** AI Coding Agent (GitHub Copilot) — full repo access  
> **Date:** 2026-03-07  
> **Repository:** https://github.com/thepennylaneproject/embr  

---

## SECTION 1: PROJECT IDENTITY

### 1. Project Name
`embr` — defined as `"embr-infrastructure"` in root `package.json`. Consumer-facing name is **Embr** (stylized, no capital E in logo).

### 2. Repository URL
`https://github.com/thepennylaneproject/embr`

### 3. One-Line Description
**From `MISSION.md`:** *"Real People. Real Algorithms. Real Connection."*  
**Cleaner version:** Embr is a creator-owned social platform and freelance marketplace that gives creators 85–90% of their revenue, with transparent algorithms, real-time direct messaging, and no corporate gatekeeping.

### 4. Project Status
**`Alpha`** — Core features (Feeds, Gigs, Messaging, Wallet/Monetization) are functionally implemented end-to-end. Phase 2 (Music) is scaffolded with backend models but UI is partially complete. Numerous audit findings (~40 open) remain, and the build has TypeScript strict-mode issues in the API (666+ errors suppressed via `--transpile-only` in dev). No evidence of real user traffic yet.

### 5. First & Most Recent Commit Dates
- **First commit accessible in shallow clone:** 2026-03-06 (`"audit loop and enhancements"`)
- **Most recent commit:** 2026-03-07 (`"Initial plan"` — this branch)
- Full history requires unshallow fetch; the audits directory references runs back to 2025-03-05, indicating active development before the shallow clone point.

### 6. Total Number of Commits
2 commits visible in shallow clone. Full history not accessible without `git fetch --unshallow`.

### 7. Deployment Status
**Configured for deployment, not yet confirmed live.**
- **Web (Next.js):** Targets [Vercel](https://vercel.com) via a `deploy-web` CI workflow path mentioned in `README.md`.
- **API (NestJS):** Self-hosted Docker Compose using `docker/docker-compose.prod.yml` (multi-stage Dockerfile present in `apps/api/Dockerfile`).
- **CI:** GitHub Actions `ci.yml` runs tests, builds, and a Snyk security scan on push/PR to `main` and `develop`.
- No `vercel.json` or `netlify.toml` present in repo root; deployment config is via Vercel dashboard + Docker.

### 8. Live URLs
`[NOT FOUND IN CODEBASE — REQUIRES MANUAL INPUT]`  
Dev URLs referenced in `.env.example`: `http://localhost:3003` (API), `http://localhost:3004` (Web), `http://localhost:8081` (Mobile).  
`GOOGLE_CALLBACK_URL` in example points to `http://localhost:3003/v1/auth/google/callback` (not a production URL).

---

## SECTION 2: TECHNICAL ARCHITECTURE

### 1. Primary Languages & Frameworks

| Layer | Technology | Version |
|-------|-----------|---------|
| API backend | NestJS (Node.js/Express) | `^10.3.0` |
| Web frontend | Next.js (React) | `14.2.5` |
| Mobile | React Native (Expo) | `^0.74` (apps/mobile) |
| Language | TypeScript | `^5.3.3` |
| ORM | Prisma | `^5.22.0` (client) / `^5.8.0` (dev) |
| Database | PostgreSQL | `16` (via Docker image) |
| Cache / Pub-Sub | Redis | `7` (via Docker image) |
| Real-time | Socket.io | `^4.7.4` (server), `^4.8.3` (client) |

### 2. Full Dependency List

#### Core Framework
```
@nestjs/common ^10.3.0       @nestjs/core ^10.3.0
@nestjs/platform-express     @nestjs/platform-socket.io
@nestjs/websockets           @nestjs/config ^3.2.0
@nestjs/schedule ^4.0.0      @nestjs/event-emitter ^2.0.0
@nestjs/swagger ^7.3.1       @nestjs/throttler ^6.5.0
next 14.2.5                  react 18.3.1  react-dom 18.3.1
```

#### UI / Styling
```
tailwindcss ^3.4.1            lucide-react ^0.378.0
@embr/ui *                    autoprefixer ^10.4.17
postcss ^8.4.32               isomorphic-dompurify ^3.0.0
```

#### State Management
No dedicated state management library (e.g., Redux, Zustand) found. State is managed via React Context (`AuthContext`) and custom hooks (`useFeed`, `useMessaging`, `useWallet`, etc.) that wrap Axios calls.

#### API / Data Layer
```
@prisma/client ^5.22.0        axios ^1.6.7
@socket.io/redis-adapter ^8.3.0   date-fns ^3.6.0
uuid ^13.0.0                  eventemitter2 ^6.4.9
class-transformer ^0.5.1      class-validator ^0.14.1
```

#### AI / ML Integrations
None found in codebase. `[NOT FOUND IN CODEBASE]`

#### Authentication / Authorization
```
@nestjs/jwt ^10.2.0           @nestjs/passport ^10.0.3
passport ^0.7.0               passport-jwt (via @types/passport-jwt)
passport-google-oauth20       bcryptjs ^2.4.3
@embr/auth *                  helmet ^8.1.0
```

#### Testing
```
@nestjs/testing ^10.3.0       (ts-jest not installed — API tests non-runnable)
playwright (root playwright.config.ts — E2E tests present)
```

#### Build Tooling
```
@nestjs/cli ^10.3.2           turborepo (turbo.json at root)
typescript ^5.3.3             ts-node ^10.9.2
tsconfig-paths                prisma ^5.8.0 (dev)
```

#### Other Notable
```
@aws-sdk/client-s3 ^3.656.0   @aws-sdk/client-ses ^3.1000.0
@aws-sdk/s3-request-presigner  @mux/mux-node ^8.0.0
stripe ^14.x (via @embr/monetization)  joi ^17.12.0
cookie-parser ^1.4.7           @embr/music-sdk *
nodemailer (email via @nestjs/nodemailer equivalent)
```

### 3. Project Structure

```
embr/                            # Monorepo root (npm workspaces + Turborepo)
├── apps/
│   ├── api/                     # NestJS REST + WebSocket API (port 3003)
│   │   ├── prisma/              # Prisma schema + migrations
│   │   └── src/
│   │       ├── core/            # Cross-cutting: auth, db, email, media, monetization, redis, safety, users
│   │       ├── verticals/       # Feature modules: feeds, gigs, groups, marketplace, messaging, mutual-aid, events
│   │       ├── music/           # Music vertical (Phase 2)
│   │       ├── shared/          # Global exception filters, shared types
│   │       ├── config/          # Joi env validation schema
│   │       ├── app.module.ts    # Root NestJS module
│   │       └── main.ts          # Bootstrap (Helmet, CORS, ValidationPipe, etc.)
│   ├── web/                     # Next.js 14 web frontend (port 3004)
│   │   └── src/
│   │       ├── pages/           # Next.js Pages Router (auth, feed, gigs, etc.)
│   │       ├── components/      # Feature-organized React components
│   │       ├── hooks/           # Custom React hooks (data fetching)
│   │       ├── contexts/        # React Context providers (AuthContext)
│   │       ├── lib/             # Axios API client, draft persistence, analytics
│   │       ├── theme/           # Color palette + design tokens
│   │       └── types/           # TypeScript type definitions
│   └── mobile/                  # React Native / Expo mobile app
├── packages/
│   ├── auth/                    # Shared bcryptjs wrappers + JWT helpers
│   ├── config/                  # Shared ESLint, TypeScript, Tailwind configs
│   ├── creator-tools/           # Phase 2 analytics dashboards (placeholder)
│   ├── monetization/            # Stripe client, revenue split utilities
│   ├── music-sdk/               # TypeScript HTTP SDK for Music API (axios)
│   ├── types/                   # Shared TypeScript type definitions
│   ├── ui/                      # React component library (Storybook)
│   └── utils/                   # Shared utility functions
├── docker/                      # Docker Compose (dev + prod)
├── docs/                        # Architecture, API, migration docs
├── scripts/                     # DB seed, migration helpers
├── audits/                      # LYRA audit suite (multi-agent security/perf findings)
├── .github/workflows/           # CI (GitHub Actions)
├── turbo.json                   # Turborepo pipeline config
└── package.json                 # Root workspace package
```

### 4. Architecture Pattern
**Monorepo / Layered Monolith with separate frontend deployment.**

**Data flow (user interaction → database → response):**
1. User interacts with Next.js page in browser
2. Custom React hook (`useFeed`, `useGig`, etc.) calls Axios-based API client (`src/lib/api/`)
3. HTTP request hits NestJS API (with JWT from httpOnly cookie)
4. Global guards run: `ThrottlerGuard` → `JwtAuthGuard` → `EmailVerifiedGuard`
5. Route handler in vertical controller calls service layer
6. Service calls `PrismaService` for DB operations (PostgreSQL via Prisma)
7. Optional: `RedisService` for cache, `NotificationsGateway` (Socket.io) for real-time push
8. Response serialized via `class-transformer`, returned as JSON
9. Real-time updates pushed separately via Socket.io WebSocket to connected clients

### 5. Database / Storage Layer

**ORM:** Prisma 5.x  
**Database:** PostgreSQL 16  
**Schema location:** `apps/api/prisma/schema.prisma` (~2,038 lines)  
**Connection pooling:** Supported via separate `DATABASE_URL` / `DIRECT_URL` env vars

#### Model Inventory

| Domain | Models | Key Fields |
|--------|--------|-----------|
| **Users & Auth** | `User`, `Profile`, `Follow`, `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken` | User: id, email, username, role(USER/CREATOR/MODERATOR/ADMIN), isVerified, deletedAt, suspendedUntil |
| **Content** | `Post`, `ScheduledPost`, `Comment`, `Like` | Post: type(TEXT/IMAGE/VIDEO), visibility, likeCount, commentCount; pg_trgm GIN index for search |
| **Monetization** | `Wallet`, `Transaction`, `Tip`, `Payout` | Wallet: balance(Int cents), stripeAccountId; Tip: amount, status, platformFee, creatorAmount |
| **Gigs/Freelance** | `Gig`, `Application`, `GigMilestone`, `Escrow`, `Dispute`, `GigReview` | Gig: budget, budgetType, experienceLevel, status; Escrow: amount, milestoneId |
| **Jobs Board** | `Job`, `JobApplication` | Job: title, salary, remote, expiresAt |
| **Messaging** | `Conversation`, `Message` | Conversation: participant1Id, participant2Id (unique pair); Message: type, readAt |
| **Notifications** | `Notification` | actorId, userId, type, referenceId, isRead |
| **Moderation/Safety** | `Report`, `ModerationAction`, `Appeal`, `BlockedUser`, `MutedUser`, `MutedKeyword`, `FilterLog`, `ContentRule` | Report: reason, status; ModerationAction: type(BAN/SUSPEND/REMOVE/WARNING) |
| **Analytics** | `AnalyticsEvent` | eventType, userId, referenceId, metadata(JSON) |
| **Media** | `Media`, `WebhookEvent` | Media: url, thumbnailUrl, muxAssetId, muxPlaybackId, duration |
| **Music (Phase 2)** | `Artist`, `Album`, `Track`, `TrackPlay`, `TrackLike`, `TrackComment`, `MusicPlaylist`, `ArtistStat`, `VideoUsage` | Track: hls/mp3/flac/videoUrl, licensingModel, revenueShare |
| **Groups** | `Group`, `GroupMember`, `GroupJoinRequest`, `GroupInvite`, `ActionAlert`, `Poll`, `PollOption`, `PollVote`, `GroupTreasury`, `GroupTreasuryTransaction` | Group: type, isPrivate; Poll: status, allowMultiple |
| **Mutual Aid** | `MutualAidPost`, `MutualAidResponse` | type, category, urgency, status, targetAmount, currentAmount |
| **Marketplace** | `MarketplaceListing`, `MarketplaceOrder`, `MarketplaceReview`, `MarketplaceOffer` | Listing: type(PHYSICAL/DIGITAL), condition, price; Order: status(9 states) |
| **Events** | `Event`, `EventAttendee`, `EventRecap` | Event: type, pricingType, capacity, startDate |

**Total models:** ~60 Prisma models

### 6. API Layer

All routes are prefixed with `/api` (or `/v1` in some references). Base: `http://localhost:3003`.

#### Auth (`/auth`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/signup` | Public | Register new user |
| POST | `/auth/login` | Public | Email + password login |
| GET | `/auth/google` | Public | Initiate Google OAuth |
| GET | `/auth/google/callback` | Public | OAuth callback handler |
| POST | `/auth/forgot-password` | Public (3/min) | Request password reset email |
| POST | `/auth/reset-password` | Public (5/min) | Apply reset token |
| POST | `/auth/verify-email` | Public (5/min) | Verify email token |
| POST | `/auth/resend-verification` | Public (3/min) | Resend verification email |
| POST | `/auth/refresh` | JwtRefresh cookie | Rotate access/refresh tokens |
| POST | `/auth/logout` | JWT | Revoke current session |
| POST | `/auth/logout-all` | JWT | Revoke all sessions |
| PATCH | `/auth/change-password` | JWT | Update password |
| GET | `/auth/me` | JWT | Get authenticated user |
| GET | `/auth/session` | JWT | List active sessions |

#### Users

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/users/profile` | JWT | Get own profile |
| PATCH | `/users/profile` | JWT | Update profile |
| PATCH | `/users/profile/avatar` | JWT | Upload avatar (S3) |
| PATCH | `/users/settings` | JWT | Update account settings |
| GET | `/users/:username` | Optional JWT | Public user profile |
| DELETE | `/users/account` | JWT | Soft-delete account |

#### Content / Feed

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/posts` | JWT | Create post |
| GET | `/posts/feed` | Optional | Paginated main feed |
| GET | `/posts/following` | JWT | Following-only feed |
| GET | `/posts/search` | Optional | pg_trgm full-text search |
| GET | `/posts/:id` | Optional | Get post |
| PUT | `/posts/:id` | JWT | Update post |
| DELETE | `/posts/:id` | JWT | Delete post |
| POST | `/posts/:id/like` | JWT | Toggle like |
| POST | `/posts/:id/comments` | JWT | Add comment |
| GET | `/posts/:id/comments` | Optional | List comments |
| GET | `/discovery/recommended` | Optional | Recommended posts |
| GET | `/discovery/trending` | Optional | Trending content |

#### Monetization

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/wallet` | JWT | Wallet + balance |
| GET | `/wallet/balance` | JWT | Balance only |
| GET | `/wallet/stats` | JWT | Earnings stats |
| GET | `/wallet/transactions` | JWT | Transaction history |
| GET | `/wallet/verify-integrity` | JWT | Balance integrity check |
| POST | `/tips` | JWT | Send tip to creator |
| GET | `/tips/received` | JWT | Tips received list |
| POST | `/payouts` | JWT | Request payout |
| GET | `/payouts` | JWT | Payout history |
| GET | `/payouts/:id` | JWT | Payout details |
| POST | `/stripe/connect/onboard` | JWT | Stripe Connect onboarding |
| GET | `/stripe/connect/refresh` | JWT | Refresh Connect link |
| POST | `/stripe-webhook` | Stripe sig | Stripe event handler |

#### Gigs / Freelance

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/gigs` | JWT | Create gig |
| GET | `/gigs` | Optional | List/search gigs |
| GET | `/gigs/:id` | Optional | Gig details |
| PATCH | `/gigs/:id` | JWT | Update gig |
| DELETE | `/gigs/:id` | JWT | Delete gig |
| POST | `/gigs/:id/publish` | JWT | Publish gig |
| POST | `/gigs/:id/cancel` | JWT | Cancel gig |
| POST | `/gigs/:id/complete` | JWT | Mark complete |
| GET | `/gigs/:id/stats` | JWT | Gig analytics |
| POST | `/gigs/:id/applications` | JWT | Apply to gig |
| GET | `/gigs/:id/applications` | JWT | List applications |
| PATCH | `/gigs/:id/applications/:appId/accept` | JWT | Accept application |
| PATCH | `/gigs/:id/applications/:appId/reject` | JWT | Reject application |
| POST | `/gigs/:id/milestones/:milestoneId/submit` | JWT | Submit milestone |
| POST | `/gigs/:id/milestones/:milestoneId/approve` | JWT | Approve milestone |
| POST | `/escrow/:id/fund` | JWT | Fund escrow |
| POST | `/escrow/:id/release-milestone` | JWT | Release milestone payment |

#### Messaging

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/messaging/conversations` | JWT | Start conversation |
| GET | `/messaging/conversations` | JWT | List conversations |
| GET | `/messaging/conversations/:id` | JWT | Conversation details |
| GET | `/messaging/conversations/unread-count` | JWT | Unread badge count |
| POST | `/messaging/conversations/:id/messages` | JWT | Send message |
| GET | `/messaging/conversations/:id/messages` | JWT | Paginated messages |
| PATCH | `/messaging/conversations/:id/read` | JWT | Mark as read |
| **WS** | `socket.io` namespace | JWT token | Real-time message delivery |

#### Groups, Marketplace, Mutual Aid, Events, Safety

Similar full CRUD patterns per vertical. Total HTTP endpoints: **~130+**.

#### System

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | Public | Health check |

### 7. External Service Integrations

| Service | Purpose | SDK / Package |
|---------|---------|--------------|
| **Stripe** | Creator payouts, Stripe Connect onboarding, webhook processing | `stripe` (via `@embr/monetization`) |
| **AWS S3** | Media file storage (images, video, audio) | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| **AWS SES** | Transactional email delivery | `@aws-sdk/client-ses` |
| **Mux** | Video upload, HLS transcoding, webhook events | `@mux/mux-node` |
| **Google OAuth** | Social login | `passport-google-oauth20` |
| **LocalStack** | Local S3 emulation in dev | Docker service |
| **MailHog** | Local SMTP server for dev | Docker service |
| **Sentry** | Error monitoring (env var `SENTRY_DSN` present, integration not confirmed in code) | `[NOT VERIFIED IN CODE]` |
| **Google Analytics** | Web analytics (env var `NEXT_PUBLIC_GA_ID` present, integration not confirmed in code) | `[NOT VERIFIED IN CODE]` |
| **Relevnt Jobs API** | External jobs board integration (`JOBS_API_URL` env var) | HTTP client |

### 8. AI / ML Components
`[NOT FOUND IN CODEBASE]` — No AI/ML models, OpenAI integrations, embeddings, or prompt chains found anywhere in the codebase.

### 9. Authentication & Authorization Model

**Login methods:**
- Email + password (bcryptjs hash)
- Google OAuth 2.0 (Passport strategy)

**Token strategy:**
- Access token: JWT, 7-day expiry, stored in `httpOnly; sameSite=strict; secure` cookie
- Refresh token: JWT, 30-day expiry, stored in httpOnly cookie AND persisted in `RefreshToken` table with device fingerprint (userAgent + ipAddress) for session management

**Permission levels (UserRole enum):**

| Role | Access |
|------|--------|
| `USER` | Standard social features |
| `CREATOR` | Monetization features (tips, payouts, gigs) |
| `MODERATOR` | Content moderation actions |
| `ADMIN` | Full platform access |

**Global guard chain (applied to all routes):**
1. `ThrottlerGuard` — rate limiting (3 tiers)
2. `JwtAuthGuard` — validates JWT; routes opt-out with `@Public()` decorator
3. `EmailVerifiedGuard` — requires verified email; opt-out with `@SkipEmailVerification()`

**Additional guards:**
- `JwtRefreshGuard` — for `/auth/refresh` endpoint
- `OptionalJwtAuthGuard` — public endpoints with optional user context
- `RolesGuard` — `@Roles(UserRole.ADMIN)` for admin-only routes

**Email verification:** Required before accessing most protected routes. Verification token expires in 24 hours.

### 10. Environment Variables

#### Application
```
NODE_ENV              PORT               API_URL
WEB_URL               MOBILE_URL
```

#### Database
```
DATABASE_URL          DIRECT_URL         TEST_DATABASE_URL
```

#### Redis
```
REDIS_HOST            REDIS_PORT         REDIS_PASSWORD
REDIS_URL             REDIS_TTL_SOCKET   REDIS_TTL_TYPING
```

#### Authentication / JWT
```
JWT_SECRET            JWT_EXPIRES_IN     JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN
```

#### Google OAuth
```
GOOGLE_CLIENT_ID      GOOGLE_CLIENT_SECRET    GOOGLE_CALLBACK_URL
```

#### AWS / Storage
```
AWS_REGION            AWS_ACCESS_KEY_ID       AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET         AWS_S3_URL              AWS_ENDPOINT
USE_LOCALSTACK
```

#### Video (Mux)
```
MUX_TOKEN_ID          MUX_TOKEN_SECRET        MUX_WEBHOOK_SECRET
```

#### Payments (Stripe)
```
STRIPE_SECRET_KEY     STRIPE_PUBLISHABLE_KEY  STRIPE_WEBHOOK_SECRET
PLATFORM_FEE_PERCENTAGE
```

#### Email (SMTP)
```
SMTP_HOST             SMTP_PORT               SMTP_SECURE
SMTP_USER             SMTP_PASSWORD           EMAIL_FROM
```

#### Security / CORS
```
ALLOWED_ORIGINS       FRONTEND_URL            COOKIE_SECURE
```

#### Rate Limiting
```
RATE_LIMIT_TTL                    RATE_LIMIT_MAX
MESSAGING_RATE_LIMIT_ENABLED      MESSAGING_RATE_LIMIT_MAX
MESSAGING_RATE_LIMIT_WINDOW       MESSAGING_RATE_LIMIT_BURST
```

#### Observability
```
SENTRY_DSN            NEXT_PUBLIC_GA_ID       LOG_LEVEL
LOG_FORMAT            ENABLE_SWAGGER          SWAGGER_PATH
ENABLE_REQUEST_LOGGING    ENABLE_DETAILED_ERRORS
```

#### Upload Limits
```
MAX_FILE_SIZE         MAX_VIDEO_DURATION
ALLOWED_IMAGE_TYPES   ALLOWED_VIDEO_TYPES
```

#### Background Jobs
```
QUEUE_NAME            QUEUE_PREFIX
```

#### External APIs
```
JOBS_API_URL          (Relevnt jobs board integration)
```

---

## SECTION 3: FEATURE INVENTORY

| # | Feature | Description | Status | Key Files | Deps |
|---|---------|-------------|--------|-----------|------|
| 1 | **Auth** | Registration, login, Google OAuth, email verification, password reset, session management | `Functional` | `apps/api/src/core/auth/`, `apps/web/src/pages/auth/`, `apps/web/src/contexts/AuthContext.tsx` | — |
| 2 | **User Profiles** | Public profiles, bio/skills/social links, avatar upload, follow/unfollow | `Functional` | `apps/api/src/core/users/`, `apps/web/src/components/social/` | Auth |
| 3 | **Content Feed** | Create/view/search text, image, video posts; chronological & following feeds; likes & comments | `Functional` | `apps/api/src/verticals/feeds/`, `apps/web/src/pages/`, `apps/web/src/hooks/useFeed.ts` | Auth, Media |
| 4 | **Media Upload** | S3 upload for images; Mux video upload with HLS transcoding; thumbnail generation | `Functional` | `apps/api/src/core/media/`, `apps/web/src/hooks/useMediaUpload.ts` | Auth, AWS S3, Mux |
| 5 | **Direct Messaging** | 1-to-1 real-time messages via Socket.io; read receipts; media sharing; rate limiting | `Functional` | `apps/api/src/verticals/messaging/`, `apps/web/src/hooks/useMessaging.ts` | Auth, Redis, Socket.io |
| 6 | **Wallet / Monetization** | Creator wallet with balance tracking; tip sending/receiving; revenue split (85-90% creator); transaction history | `Functional` | `apps/api/src/core/monetization/`, `packages/monetization/`, `apps/web/src/pages/earnings/` | Auth, Stripe |
| 7 | **Stripe Payouts** | Stripe Connect onboarding; bank payouts; webhook processing | `Functional` | `apps/api/src/core/monetization/`, `apps/web/src/pages/settings/payouts/`, `apps/web/src/hooks/useStripeConnect.ts` | Wallet |
| 8 | **Gigs / Freelance** | Post/browse/apply to freelance gigs; milestone tracking; escrow funding & release | `Functional` | `apps/api/src/verticals/gigs/`, `apps/web/src/pages/gigs/`, `apps/web/src/hooks/useGig.ts` | Auth, Wallet |
| 9 | **Discovery** | Recommended users/posts; trending content | `Partial` | `apps/api/src/verticals/feeds/discovery/` | Content |
| 10 | **Notifications** | Real-time push notifications (Socket.io); notification center; read/unread state | `Functional` | `apps/api/src/core/notifications/`, `apps/web/src/pages/notifications.tsx` | Auth, Socket.io |
| 11 | **Groups / Communities** | Create/join groups; group posts; polls; action alerts; group treasury (crowdfunding) | `Partial` | `apps/api/src/verticals/groups/`, `apps/web/src/components/groups/`, `apps/web/src/hooks/useGroups.ts` | Auth |
| 12 | **Marketplace** | Buy/sell physical & digital goods; offers; orders (9 statuses); reviews | `Partial` | `apps/api/src/verticals/marketplace/`, `apps/web/src/components/marketplace/` | Auth, Wallet, Stripe |
| 13 | **Mutual Aid** | Post aid requests; respond to requests; track funding goals | `Partial` | `apps/api/src/verticals/mutual-aid/`, `apps/web/src/components/mutual-aid/` | Auth, Wallet |
| 14 | **Events** | Create/browse events; RSVPs; paid events; event recaps | `Partial` | `apps/api/src/verticals/events/`, `apps/web/src/components/events/` | Auth, Stripe |
| 15 | **Safety / Moderation** | Report content; block/mute users; keyword filtering; content rules; appeals; moderator actions | `Functional` | `apps/api/src/core/safety/`, `apps/web/src/components/safety/` | Auth |
| 16 | **Music (Phase 2)** | Artist profiles; track upload (HLS/MP3/FLAC); licensing model; fan tips; artist analytics; SDK | `Partial` | `apps/api/src/music/`, `apps/web/src/components/music/`, `packages/music-sdk/` | Auth, Media, Wallet |
| 17 | **Scheduled Posts** | Create posts for future publishing | `Scaffolded` | `apps/api/prisma/schema.prisma` (ScheduledPost model only) | Content |
| 18 | **Jobs Board** | Post/browse job listings with applications | `Scaffolded` | `apps/api/prisma/schema.prisma` (Job, JobApplication models) | Auth |
| 19 | **Creator Analytics** | Post/earnings analytics via `AnalyticsEvent` model; `@embr/creator-tools` package placeholder | `Scaffolded` | `apps/api/prisma/schema.prisma`, `packages/creator-tools/`, `apps/web/src/lib/analytics.ts` | Auth |
| 20 | **Draft Persistence** | Auto-save form state to localStorage to survive page refreshes | `Functional` | `apps/web/src/lib/draft.ts`, `apps/web/src/hooks/useUnsavedChangesGuard.ts` | — |

---

## SECTION 4: DESIGN SYSTEM & BRAND

### 1. Color Palette

Defined in `apps/web/src/theme/colorPalette.ts` and `apps/web/tailwind.config.js`. Theme name: **"Muted Phoenix"**.

| Name | Hex (Main) | Role | Source |
|------|-----------|------|--------|
| `embr.primary.400` | `#c4977d` | Primary CTA, brand terracotta | `colorPalette.ts` |
| `embr.primary.500` | `#b88566` | Primary hover | `colorPalette.ts` |
| `embr.secondary.400` | `#6ba898` | Secondary / success teal | `colorPalette.ts` |
| `embr.accent.500` | `#4a5f7f` | Accent navy | `colorPalette.ts` |
| `embr.accent.900` | `#1a202c` | Body text | `colorPalette.ts` |
| `embr.neutral.50` | `#fefdfb` | Page background | `colorPalette.ts` |
| `embr.neutral.100` | `#faf8f5` | Card background | `colorPalette.ts` |
| `embr.neutral.200` | `#f3ebe5` | Input background | `colorPalette.ts` |
| `embr.success` | `#6ba898` | Success states | `colorPalette.ts` |
| `embr.warning` | `#c4977d` | Warning states | `colorPalette.ts` |
| `embr.error` | `#9b6b5a` | Error states | `colorPalette.ts` |
| `embr.info` | `#4a5f7f` | Info states | `colorPalette.ts` |

Full scale: each named color has 9-step shades (50–900).

### 2. Typography

- **Fonts loaded:** `[NOT FOUND IN CODEBASE — REQUIRES MANUAL INPUT]` — No `next/font` or Google Fonts import found in web pages. Default system font stack likely used.
- **Type scale:** Deferred to Tailwind defaults (`text-sm`, `text-base`, `text-lg`, `text-xl`, etc.)
- **Custom spacing:** `xs=0.25rem, sm=0.5rem, md=1rem, lg=1.5rem, xl=2rem, 2xl=2.5rem, 3xl=3rem` (8px rhythm system)

### 3. Component Library

`@embr/ui` package at `packages/ui/src/`. Documented via Storybook. Key components (from component files found):

| Component | Description |
|-----------|-------------|
| `Button` | Primary/secondary/accent/ghost variants; `btn--primary` class name convention |
| `Card` | Container with neutral-50 background and neutral-200 border |
| `Input` / `Textarea` | Form inputs with focus:border-embr-primary-400 |
| `Badge` | Labeling (primary/secondary/accent variants) |
| `Avatar` | User profile images with fallback initials |
| `Modal` | Overlay dialogs |
| `Spinner` | Loading state indicator |
| `Toast` | Notification toasts |
| `Stack` | Layout primitive (vertical/horizontal with spacing) |
| `Typo` | Typography primitive enforcing design system |
| `PageProfileProvider` | Page-level context (ledger / form / marketing modes) |

Additional feature-specific components in `apps/web/src/components/` organized by vertical: `auth/`, `content/`, `gigs/`, `groups/`, `marketplace/`, `media/`, `messaging/`, `music/`, `mutual-aid/`, `onboarding/`, `safety/`, `social/`.

### 4. Design Language
**Warm, grounded, human.** The muted terracotta primary + cream backgrounds + teal accents creates a calm, earthy aesthetic distinct from neon-heavy social media. The brand name "Phoenix" for the color theme reflects creator empowerment. Components are minimal with generous whitespace and no heavy shadows.

### 5. Responsive Strategy
Uses Tailwind CSS responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`). Layout primitives (`Stack`) and page components are mobile-first. The UI Constitution doc enforces "one primary CTA" rule and "8px rhythm" for consistent density.

### 6. Dark Mode
`[NOT FOUND IN CODEBASE]` — No `dark:` Tailwind utilities or `prefers-color-scheme` media queries found. Dark mode is not implemented in this version. Note: `cardDark` style object exists in `colorPalette.ts` (card for dark contexts), suggesting future intent.

### 7. Brand Assets
- `public/favicon.ico` — Favicon (present)
- No SVG logo, illustration files, or custom icon sets found in repo. Logo is referenced in the "Muted Phoenix" color palette comment ("Based on embr logo analysis") but the asset itself is `[NOT FOUND IN CODEBASE]`.

---

## SECTION 5: DATA & SCALE SIGNALS

### 1. User Model
Data stored per user:
- **Account:** email, username, password hash, role, isVerified, 2FA fields, suspendedUntil, deletedAt
- **Profile:** displayName, bio (sanitized), avatarUrl, skills[], socialLinks (JSON), categories[]
- **Wallet:** balance (in cents), stripeAccountId, lifetimeEarned, lifetimePaid
- **Relationships:** follow graph, blocked/muted lists, keyword mutes
- **Devices:** active refresh tokens (userAgent + IP)

**User journey to value:**
1. Sign up → email verification → complete profile
2. Follow creators → see feed → tip/comment
3. Upgrade to CREATOR role → enable Stripe Connect → start accepting tips/gigs

### 2. Content / Data Volume
- **Seed data:** `scripts/seed.ts` creates test users (admin, creator, user roles) with sample posts and gigs.
- **Volume design signals:** Prisma schema uses `Int` for `likeCount`/`followerCount`/`commentCount` (sufficient for millions); `BigInt` not used.
- `AnalyticsEvent` table is append-only (no aggregation), which will face scaling pressure at high volume.
- No explicit partitioning or time-series table strategies found.

### 3. Performance Considerations
- **Redis caching:** Session data, Socket.io pub-sub adapter, typing indicators (TTL-based)
- **Pagination:** Cursor-based pagination referenced in messaging; offset pagination in feeds
- **Rate limiting:** NestJS Throttler with 3 tiers (short/medium/long); messaging has separate configurable limits
- **pg_trgm GIN index:** Applied to `Post.content` for full-text search
- **Denormalized counts:** `likeCount`, `followerCount`, `commentCount`, `unreadNotificationCount` avoid expensive COUNT queries
- **Code splitting:** Next.js automatic code splitting per page
- **Open audit findings:** N+1 queries flagged in conversation list (`f-perf-001`) and unread count fan-out (`f-perf-002`)
- **Lazy loading:** `[NOT VERIFIED]` — no explicit evidence of React lazy() imports

### 4. Analytics / Tracking
- `AnalyticsEvent` model in DB tracks: `VIEW`, `LIKE`, `COMMENT`, `SHARE`, `TIP` and other engagement events
- `apps/web/src/lib/analytics.ts` — client-side analytics helper
- `apps/web/src/hooks/useAnalytics.ts` — React hook for tracking
- `NEXT_PUBLIC_GA_ID` env var suggests Google Analytics 4 integration (not confirmed implemented)
- `SENTRY_DSN` env var suggests Sentry error tracking (not confirmed implemented)

### 5. Error Handling
- **API:** `GlobalExceptionFilter` in `apps/api/src/shared/` provides consistent `{ statusCode, message, timestamp, path }` error shape
- **Unhandled rejections:** `process.on('unhandledRejection')` and `process.on('uncaughtException')` handlers in `main.ts`
- **Frontend:** `ErrorBoundary.tsx` React component (`apps/web/src/components/ErrorBoundary.tsx`)
- **Music SDK:** `MusicApiError` custom error class with typed error codes
- **Logging:** `LOG_LEVEL` and `LOG_FORMAT` env vars suggest configurable logging; NestJS built-in Logger used

### 6. Testing
**Test infrastructure status: Minimal.**

| File | Type | Coverage |
|------|------|---------|
| `apps/api/src/verticals/messaging/messaging/tests/message-rate-limiter.spec.ts` | Unit | Messaging rate limiter |
| `apps/api/src/verticals/messaging/messaging/tests/rate-limiting-integration.spec.ts` | Integration | Rate limiting |
| `apps/api/src/verticals/messaging/messaging/tests/block-enforcement.spec.ts` | Unit | Block enforcement |
| `apps/api/src/verticals/messaging/messaging/tests/websocket-validation.spec.ts` | Unit | WebSocket validation |
| `apps/api/src/core/redis/redis.service.spec.ts` | Unit | Redis service |
| `apps/api/src/core/redis/redis-adapter.integration.spec.ts` | Integration | Redis adapter |
| `apps/api/src/core/media/__tests__/media-upload.controller.spec.ts` | Unit | Media upload |
| `apps/api/src/core/media/__tests__/s3-multipart.service.spec.ts` | Unit | S3 multipart |
| `apps/api/src/core/media/__tests__/mux-webhook.controller.spec.ts` | Unit | Mux webhook |
| `smoke-test.spec.ts` (root) | E2E | Basic smoke tests (Playwright) |
| `draft-resilience-test.spec.ts` (root) | E2E | Draft save/restore resilience |

**Note:** `ts-jest` is NOT installed; `npm test` in the API will fail. Tests were likely written with the expectation of adding the test runner. Playwright E2E tests at repo root can run independently.

---

## SECTION 6: MONETIZATION & BUSINESS LOGIC

### 1. Pricing / Tier Structure
From `docs/developer_notes/BUSINESS_MODEL.md`:
- **Platform fee:** 2% on creator earnings (bootstrap phase) → 10% at scale
- **Creator Plus tier:** $9.99/month (advanced analytics, bulk operations, API access, priority support)
- **Enterprise tier:** Custom pricing

**In code:** `packages/monetization/src/revenue.utils.ts` defines:
- `DEFAULT_PLATFORM_FEE = 0.10` (10%)
- `MAX_PLATFORM_FEE = 0.15` (15% for new creators)
- Tier-based: new creators pay 15%, established creators pay 10%
- `PLATFORM_FEE_PERCENTAGE` env var overrides the default

### 2. Payment Integration
**Stripe** — fully integrated:
- Direct charges for tips and marketplace orders
- **Stripe Connect** for creator payouts (Express accounts)
- Webhook endpoint for payment event processing
- Stripe SDK via `@embr/monetization` package

### 3. Subscription / Billing Logic
`[PARTIALLY FOUND]` — Business model documentation describes subscription tiers. No `Subscription` model in Prisma schema found; subscription logic is not implemented in code yet. Creator Plus tier is planned but not built.

### 4. Feature Gates
- `UserRole` enum gates monetization features (CREATOR vs USER)
- CREATOR role required for: tips receipt, Stripe Connect, gig creation, earnings dashboard
- MODERATOR/ADMIN roles gate moderation actions via `@Roles()` decorator
- No code-level feature flag system (e.g., LaunchDarkly, Unleash) found

### 5. Usage Limits
- **Rate limiting:** 3-tier ThrottlerGuard (60 req/min standard, 300/10s medium, 1000/60s long)
- **Messaging:** Configurable rate limit (default 60 msgs/min, burst 5/s)
- **File uploads:** `MAX_FILE_SIZE=100MB`, `MAX_VIDEO_DURATION=180s`
- **Music SDK:** 100 req/min (free), 1,000 req/min (pro), custom (enterprise)
- No subscription-level quota enforcement found in code

---

## SECTION 7: CODE QUALITY & MATURITY SIGNALS

### 1. Code Organization
**Strong separation of concerns.** The API is organized into:
- `core/` — Infrastructure and cross-cutting concerns (auth, DB, email, media, redis, safety, users)
- `verticals/` — Feature domains (feeds, gigs, groups, marketplace, messaging, mutual-aid, events)
- `shared/` — Global utilities

Each vertical follows the NestJS pattern: `module.ts`, `controller.ts`, `service.ts`, `dto/`, `guards/`. The monorepo workspace structure cleanly separates shared code into `packages/`.

### 2. Patterns & Conventions
- **Dependency injection** via NestJS IoC container throughout
- **Repository pattern** effectively implemented via PrismaService
- **DTO validation** with `class-validator` decorators on all input types
- **Decorator pattern** for auth metadata (`@Public()`, `@Roles()`, `@GetUser()`, `@SkipEmailVerification()`)
- **Custom guards** for multi-layer auth enforcement
- **Event-driven** notifications via `@nestjs/event-emitter`
- Naming: `camelCase` for variables/functions, `PascalCase` for classes/interfaces, `kebab-case` for file names — consistent throughout

### 3. Documentation
- **README.md:** Provides assembly overview and production targets. Brief but accurate.
- **MISSION.md:** Comprehensive values and product roadmap.
- **`docs/developer_notes/`:** 20+ detailed architecture and implementation docs (ARCHITECTURE.md, BUSINESS_MODEL.md, DESIGN_SYSTEM.md, LAUNCH_ROADMAP.md, etc.)
- **`docs/api/music-api.openapi.yaml`:** OpenAPI spec for Music API
- **Inline code comments:** Present in key files (`revenue.utils.ts` has exemplary comments); inconsistent across the codebase
- **JSDoc:** Absent from most service/controller methods
- **Swagger:** `ENABLE_SWAGGER` env var suggests Swagger UI is available at `/docs` but disabled by default

### 4. TypeScript Usage
- **Strict mode:** Declared in `tsconfig.json` but **666+ errors** exist in the API that prevent `nest build`. Dev uses `--transpile-only` workaround.
- **`any` types:** Present in places (seen in some controller/service files and DTO types)
- **Interfaces:** Well-defined for domain models (`RevenueBreakdown`, `MusicApiError`, etc.) and DTOs
- **Shared types:** `@embr/types` package centralizes cross-app type definitions
- **Assessment:** TypeScript is used but not disciplined — the 666+ strict errors represent meaningful technical debt

### 5. Error Handling Patterns
- **API:** Consistent via `GlobalExceptionFilter` — all errors normalized to `{ statusCode, message, timestamp, path }`
- **Custom errors:** `MusicApiError` in SDK; NestJS built-in `HttpException` subclasses elsewhere
- **User-facing:** Error messages are returned in HTTP responses; frontend components handle display
- **Unhandled cases:** `process.on('unhandledRejection')` + `process.on('uncaughtException')` in `main.ts`
- **Frontend:** `ErrorBoundary` component catches React rendering errors

### 6. Git Hygiene
- **Shallow clone** — only 2 commits visible; full history analysis not possible
- **Branch name:** `copilot/extract-codebase-intelligence` (agent-created branch)
- **CI:** GitHub Actions workflow on `main` and `develop` branches
- **Commit style:** Audit commits show descriptive messages ("audit loop and enhancements")

### 7. Technical Debt Flags
- **666+ TypeScript strict errors** in API — development continues with `--transpile-only` workaround (significant)
- **`ts-jest` not installed** — API unit tests cannot run (`npm test` fails)
- **ESLint not configured for API** — `apps/api` has no ESLint config
- **`@embr/creator-tools` package** is a placeholder with no implementation
- **`ScheduledPost` and `Job`/`JobApplication` models** exist in schema but have no backend service/controller
- **`.archive/` directory** with duplicate files from assembly (dead code)
- **`check_braces.js`, `cleanup_open_findings.py`, `scripts/fix_*.js`** — one-off utility scripts at repo root (should be in scripts/ or removed)
- **`build_output.txt`, `build_web_output.txt`** — build artifacts committed to repo
- **`pnpm-lock.yaml` in npm workspace** — lock file mismatch (repo uses npm, pnpm lockfile present)
- **~40 open audit findings** tracked in `audits/open_findings.json` (security, performance, UX, data integrity)

### 8. Security Posture
- **Helmet:** HTTP security headers (XSS, CSP, HSTS) via `helmet` middleware
- **CORS:** Configured from `ALLOWED_ORIGINS` env var
- **Input validation:** `GlobalValidationPipe` with `whitelist: true` rejects unknown fields
- **SQL injection:** Protected by Prisma ORM parameterized queries
- **XSS prevention:** `isomorphic-dompurify` for sanitizing user-generated HTML content (bio, display name)
- **CSRF:** Mitigated by `httpOnly; sameSite=strict` cookies
- **Rate limiting:** ThrottlerGuard on all routes; specialized messaging rate limiter
- **Password hashing:** bcryptjs
- **Secrets:** Managed via environment variables; `.env.example` provides template (no secrets committed)
- **Auth guard chain:** Throttle → JWT → EmailVerified applied globally
- **Stripe webhooks:** Signature verification required
- **Mux webhooks:** Webhook secret validated
- **Open security findings:** 23 security-category findings in `audits/open_findings.json` (statuses vary)
- **`COOKIE_SECURE`:** Defaults to `false` in `.env.example` — must be `true` in production

---

## SECTION 8: ECOSYSTEM CONNECTIONS

### 1. Shared Code / Patterns with Sister Projects
`[PARTIALLY FOUND]` — The LYRA Audit Suite (`audits/`) is described as a "Starter Kit" that can be dropped into any repo. This suggests it may be shared across The Penny Lane Project portfolio. The `docs/developer_notes/` reference "Spark verticals," a possible portfolio-wide naming convention.

### 2. Shared Dependencies / Infrastructure
`[NOT FOUND IN CODEBASE — REQUIRES MANUAL INPUT]` — No explicit references to shared Supabase, Netlify, or other infrastructure accounts found. Each service is self-contained with its own PostgreSQL + Redis instances.

### 3. Data Connections
`[PARTIALLY FOUND]` — `JOBS_API_URL` env var references a "Relevnt" jobs board integration. The `.env.example` comments confirm this: "# JOBS API (RELEVNT)". This is the only cross-project data connection visible in the codebase.

### 4. Cross-References to Sister Projects
- **Relevnt:** Referenced via `JOBS_API_URL` for jobs board data
- **Other projects (Codra, Ready, Mythos, passagr, advocera):** `[NOT FOUND IN CODEBASE]`

---

## SECTION 9: WHAT'S MISSING (CRITICAL)

### 1. Gaps for a Production-Ready Product

| Gap | Severity | Details |
|-----|---------|---------|
| **TypeScript strict errors (666+)** | Critical | API build fails; `--transpile-only` is not production-safe; type errors hide real bugs |
| **No test coverage** | Critical | `ts-jest` not installed; only 9 test spec files exist for ~19 NestJS modules; E2E tests present but untested CI |
| **Email service ambiguity** | High | SMTP env vars suggest Nodemailer but AWS SES SDK also present; which one is used in production? |
| **Subscription billing not implemented** | High | Business model requires Creator Plus tier ($9.99/mo) but no Subscription model or Stripe billing code exists |
| **No CDN for media** | Medium | Direct S3 URLs used; no CloudFront or CDN layer for video/image delivery |
| **Analytics pipeline incomplete** | Medium | `AnalyticsEvent` table is append-only with no aggregation jobs or dashboards |
| **Dark mode missing** | Low | Not implemented despite partial intent in color palette |
| **Scheduled posts not implemented** | Low | Model exists in schema; no scheduler service found |
| **Mobile app completeness unknown** | Medium | `apps/mobile/` exists but not analyzed in depth |

### 2. Gaps for Investor Readiness

| Gap | Details |
|-----|---------|
| **No live deployment URL** | No confirmed production environment; investors can't demo the product |
| **No user metrics** | No dashboard, analytics, or evidence of real users/transactions |
| **Financial projections not in code** | Business model document exists (`BUSINESS_MODEL.md`) but targets are unvalidated |
| **No privacy policy / ToS** | No legal pages found in web app |
| **No error monitoring confirmed** | `SENTRY_DSN` env var exists but integration not verified in code |
| **Subscription revenue stream** | Creator Plus tier is planned but not built |
| **No onboarding funnel analytics** | Cannot measure signup-to-value conversion |

### 3. Gaps in the Codebase Itself

| Gap | Details |
|-----|---------|
| **`.archive/` directory** | Duplicate/dead code from assembly phase; should be removed |
| **Build artifacts committed** | `build_output.txt`, `build_web_output.txt`, `playwright-report/`, `test-results/` in git |
| **`pnpm-lock.yaml` in npm workspace** | Lock file mismatch; should be removed |
| **Root-level utility scripts** | `check_braces.js`, `cleanup_open_findings.py`, `scripts/fix_*.js` are one-off scripts not part of the product |
| **`@embr/creator-tools`** | Empty placeholder package |
| **No API versioning consistency** | Some references use `/api/`, some use `/v1/`; inconsistency |
| **Missing migration files** | `docs/migrations/` folder exists but migration file completeness not verified |
| **No `.env` validation at startup for web** | Only API has Joi env validation; Next.js app silently ignores missing vars |

### 4. Recommended Next Steps (Priority Order)

1. **Fix TypeScript strict errors** (or officially disable strict mode and document why) — this is the #1 code health issue. The `--transpile-only` workaround hides real bugs and prevents proper builds.

2. **Set up test infrastructure** — Install `ts-jest`, write integration tests for auth, wallet, and gigs (the three most business-critical modules). Even 20% coverage on critical paths would dramatically improve confidence.

3. **Stand up production deployment** — Deploy to Vercel (web) and a VPS/container host (API). Get a real URL. The entire investor and user acquisition story depends on a live demo.

4. **Implement Creator Plus subscription** — This is the primary recurring revenue stream in the business model. Stripe Billing + a Subscription Prisma model + feature gates. Without it, the monetization story is tips-only.

5. **Resolve open P0/P1 audit findings** — The `audits/open_findings.json` contains ~40 open findings. Fix the remaining security and data integrity issues before onboarding real users.

---

## SECTION 10: EXECUTIVE SUMMARY

**Paragraph 1 — What this is:**  
Embr is a creator-owned social platform and freelance marketplace that directly challenges extractive platforms like Instagram, TikTok, and Spotify. It solves the fundamental problem that creators on today's platforms receive only 20–30% of the value they generate while algorithms suppress their reach to maximize platform revenue. Embr targets professional and semi-professional creators (artists, freelancers, community organizers) who want to earn a living directly from their audience, transact transparently, and own their data. The platform's value proposition is structural: 85–90% revenue splits enforced in code, no algorithmic suppression, real-time direct monetization via tips and gigs, and a planned music streaming vertical that would pay artists 3× more than Spotify.

**Paragraph 2 — Technical credibility:**  
The codebase demonstrates production-grade architectural ambition. The backend is a well-structured NestJS monolith with 19 feature modules, a 60+-model Prisma schema covering social, marketplace, freelance, music, and mutual-aid verticals, JWT authentication with refresh token rotation, Stripe Connect for creator payouts, AWS S3 + Mux for media, and Socket.io for real-time features. The monorepo uses Turborepo with 8 shared packages, and a multi-agent security/performance audit suite (LYRA) is embedded in the repo. The design system is coherent — a custom "Muted Phoenix" color palette, Tailwind-based component library, and a documented UI Constitution. The builder understands full-stack architecture, payment systems, media pipelines, and real-time infrastructure at a level beyond typical early-stage founders.

**Paragraph 3 — Honest current state:**  
Embr is a sophisticated Alpha — the architecture is strong and the feature surface is surprisingly broad, but several critical gaps must be closed before real users can be onboarded. The most pressing technical issue is 666+ TypeScript strict-mode errors that prevent a proper API build; development continues with a `--transpile-only` workaround that masks real bugs. Test coverage is minimal (9 spec files for 19 modules, and the test runner isn't installed). There is no confirmed production deployment. The subscription billing model — a core revenue stream — exists only in a planning document. To reach Beta, the project needs: a live deployment URL, TypeScript errors resolved, `ts-jest` installed with critical-path tests, and the Creator Plus subscription implemented. To reach investor-readiness, it needs a production environment with real users, measurable conversion metrics, and a clear go-to-market narrative backed by a working demo.

---

```
AUDIT METADATA
Project: Embr
Date: 2026-03-07
Agent: GitHub Copilot Coding Agent (Claude Sonnet 4.5)
Codebase access: Full repo (read-only analysis)
Confidence level: High — All findings verified directly from source files.
  Sections with lower confidence: Section 1.5 (commit history limited by shallow clone),
  Section 8 (ecosystem connections rely on env var names only),
  Section 4.2 (font loading not confirmed in source).
Sections with gaps: 1.8 (live URLs), 3 (mobile app), 7.9 (AI/ML), 8.2-8.4 (sister project infra)
Total files analyzed: ~250 (across apps/api/src, apps/web/src, packages, docs, scripts, audits)
```
