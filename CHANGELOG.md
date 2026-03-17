# Changelog

All notable changes to Embr are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Linear issue tracking integration
- Music SDK package (`@embr/music-sdk`) with track discovery, playback, and licensing
- Lyra design system updates across web app
- CI pipeline with PostgreSQL/Redis service containers, Prisma migrations, and web build validation
- Deploy workflow with SSH-based API deployment and Vercel web deployment
- Comprehensive security headers (CSP, HSTS, X-Frame-Options) in Next.js config
- Pre-commit hooks via Husky for secret scanning
- Merge queue documentation and `merge_group` CI support for batching approved PRs safely

### Fixed
- Resolved all P0 security findings from audit (secret rotation, cookie security, email validation)
- Fixed top 5 P1 runtime bugs: `useComments` mount guard, messaging pagination skip, `useFeed` abort signal, `getFeed` routing, cache falsy miss
- Added missing Prisma reconciliation migration for Group, MutualAid, Marketplace, Event, Poll, and Treasury models

### Changed
- Disabled strict TypeScript mode in API (`apps/api`) to unblock incremental migration (666+ pre-existing errors)
- API runs in transpile-only mode (`ts-node --transpile-only`) for development

## [0.1.0] — 2026-01-01

### Added
- NestJS API (`apps/api`) with JWT authentication, Prisma ORM, PostgreSQL 16
- Next.js 14 web frontend (`apps/web`) with Pages Router
- React Native mobile app scaffold (`apps/mobile`)
- Shared packages: `@embr/types`, `@embr/ui`, `@embr/utils`, `@embr/auth`, `@embr/config`, `@embr/monetization`, `@embr/creator-tools`
- Social feed: posts, comments, likes, follows
- Messaging: real-time direct messages via Socket.io
- Marketplace: gigs, listings, milestones
- Monetization: Stripe Connect, tips, wallet, payouts
- Groups, events, polls, treasury, mutual-aid verticals
- Media uploads with S3 and CloudFront
- Safety: moderation queue, reports, appeals, blocks, mutes
- Notifications: in-app and email (SendGrid)
- Analytics event collection endpoint
- Docker Compose setup for local development (PostgreSQL 16, Redis 7)
