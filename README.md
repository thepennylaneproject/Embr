# Embr — Creator-focused social media and freelance marketplace

> Part of <a href="https://thepennylaneproject.org">The Penny Lane Project</a> — technology that serves the individual.

## What This Is

Embr is a platform built for independent creators: a social media layer, a freelance gig marketplace, and a monetization stack in one place. It lets creators post content, find paid gigs, manage direct messaging, and receive tips and payments — without the middleman taking the majority cut.

## Current Status

**Alpha** — Core auth, content feed, media upload, direct messaging, and payments (Stripe + MUX) are functional end-to-end. Gig marketplace and safety moderation features are actively in development.

## Technical Overview

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** NestJS 10, REST + WebSocket (Socket.io)
- **Database:** PostgreSQL 16 via Prisma ORM
- **Media:** AWS S3 (file storage) + MUX (video processing)
- **Payments:** Stripe Connect (tips, payouts, escrow)
- **Deployment:** Web → Vercel; API → Docker Compose (self-hosted)

## Architecture

Turborepo monorepo with npm workspaces. Two main applications (`apps/api`, `apps/web`) share code through internal packages (`packages/types`, `packages/utils`, `packages/music-sdk`, etc.). The API is modular NestJS with vertical slices for auth, content, media, monetization, gigs, social-graph, messaging, and safety. Infrastructure (PostgreSQL 16, Redis 7) runs via Docker Compose.

## Development

```bash
# Prerequisites: Docker must be running (for PostgreSQL + Redis)
npm install
cp .env.example .env   # fill in values

# Start infrastructure
docker compose -f docker/docker-compose.yml up -d postgres redis

# Start API (transpile-only — strict TS errors are a known WIP)
cd apps/api
npx ts-node --transpile-only -r tsconfig-paths/register src/main.ts

# Start web (in a separate terminal)
npm run dev:web
```

## License

All rights reserved — © The Penny Lane Project

