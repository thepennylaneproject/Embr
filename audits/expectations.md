# embr — Expectations Document

> Source: `the_penny_lane_project/embr/embr_report.md`
> Last reviewed: 2026-03-08

---

## 1. Monorepo Architecture

### 1.1 Turborepo monorepo structure
embr is a Turborepo monorepo with three primary apps: NestJS API (`apps/api`), Next.js 14 web (`apps/web`), and React Native/Expo mobile (`apps/mobile`). Do not break this structure. File `warning` for any change that violates the monorepo package boundaries.

### 1.2 TypeScript strict mode in API
TypeScript strict mode must be enforced in `apps/api`. File `critical` if strict mode is disabled in the API package's `tsconfig.json`.

---

## 2. API Architecture (NestJS)

### 2.1 All API routes prefixed with `/v1`
Every API endpoint must be prefixed with `/v1`. File `warning` for any endpoint found outside this prefix.

### 2.2 `JwtAuthGuard` on all protected routes
Authentication is handled by `JwtAuthGuard`. All protected routes must use this guard. File `critical` for any protected route missing `JwtAuthGuard`.

### 2.3 `ThrottlerGuard` rate limiting
Rate limiting is implemented via `ThrottlerGuard`. Do not remove rate limiting from the API. File `critical` for any removal of `ThrottlerGuard` from route or module configuration.

---

## 3. Database and Infrastructure

### 3.1 PostgreSQL 16 via Prisma 5
The primary database is PostgreSQL 16, accessed via Prisma 5. Do not introduce another ORM or database client. File `critical` for any new ORM introduced alongside or replacing Prisma.

### 3.2 Redis 7 for cache and pub/sub
Redis 7 is used for caching and pub/sub messaging. File `warning` for any Redis version downgrade or Redis replacement.

### 3.3 Socket.io for real-time
Real-time features use Socket.io. Do not replace Socket.io with another WebSocket library without explicit approval. File `warning` for unauthorized WebSocket library changes.

---

## 4. Monetization Constraints

### 4.1 Creator revenue split: 85–90% to creator
The creator revenue split must maintain 85–90% to the creator. The Stripe integration in `packages/monetization/` must enforce this split. File `critical` for any change to the revenue split calculation that reduces the creator's percentage below 85%.

### 4.2 Wallet balance integrity must be verified before payouts
`GET /wallet/verify-integrity` must be called and return a clean result before any payout is processed. File `critical` for any payout flow that bypasses wallet integrity verification.

---

## 5. Media and Content

### 5.1 All media uploads through S3 presigned URLs
Media files must be uploaded via S3 presigned URLs. Direct file uploads to the API server are prohibited. File `critical` for any direct file upload endpoint on the API.

### 5.2 Video processing through Mux
All video processing must go through Mux (`@mux/mux-node`). Do not process video directly on the API server. File `critical` for any video processing that bypasses Mux.

### 5.3 Email through AWS SES
All transactional and notification email must go through AWS SES (`@aws-sdk/client-ses`). Do not introduce another email provider without explicit approval. File `warning` for any unauthorized email provider.

---

## 6. Content Moderation

### 6.1 Moderation pipeline invoked for all flagged content
The content moderation pipeline (`Report` → `ModerationAction`) must be invoked for all flagged content. File `critical` for any content flagging path that does not trigger the moderation pipeline.

---

## 7. TypeScript Debt

### 7.1 666+ suppressed TypeScript errors must be resolved before production launch
The API currently has 666+ suppressed TypeScript errors. These must be resolved — not suppressed further — before a production launch. File `critical` for any new `@ts-ignore` or `@ts-nocheck` directive added to API code.

### 7.2 `ts-jest` must be installed and configured
`ts-jest` must be installed and configured for the API's unit tests to be runnable. File `critical` if `ts-jest` is absent from `devDependencies` and API tests cannot run.

---

## 8. Feature Flags

### 8.1 Music phase-2 vertical must not be exposed in production UI
The Music phase-2 vertical must not be accessible or visible in the production UI until the backend models are complete. File `critical` for any Music vertical UI element exposed in a production build without complete backend support.

---

## 9. Out-of-Scope Constraints

- Do not modify the revenue split in `packages/monetization/` without explicit approval
- Do not deploy a payout function without wallet integrity verification
- Do not expose incomplete verticals in production without a feature flag
