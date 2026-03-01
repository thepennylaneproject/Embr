# Assembly Notes

This repo is now organized into a monorepo-style structure. The module source folders are still present in case you need to compare or re-copy. The integrated structure is intended for a future NestJS + Next.js setup.

## What Was Assembled

### Backend (NestJS-style)
All backend files were placed under `apps/api/src/modules/<module>`:

- `auth/` (auth, guards, strategies, dto, entities)
- `users/` (users module + profile entities)
- `content/` (comments controller/service/dto)
- `media/` (media pipeline + `media.module.ts`)
- `monetization/` (wallet/tips/payouts + Stripe webhook)
- `gigs/` (gigs, applications, escrow)
- `social-graph/` (follows, discovery)
- `messaging/` (controller/service/gateway/dto)
- `safety/` (reporting, blocking, moderation + roles guard)

### Frontend (Next.js-style)
Frontend files live under `apps/web/src`:

- `components/` (grouped by module)
- `hooks/` (all module hooks, flat)
- `contexts/` (auth)
- `pages/` (auth pages + discovery page)
- `lib/` (auth API client)
- `types/` (auth types)

### Shared Types + API Clients
Combined into `packages/shared`:

- `packages/shared/types/*.types.ts`
- `packages/shared/api/*.api.ts`

### Infrastructure
Copied from `embr-1-infrastructure` to repo root:

- `prisma/`, `docker/`, `env/`, `scripts/`, `package.json`

## Notes / Known Gaps

1. Several backend modules **do not include a NestJS `*.module.ts` file**. These were created as scaffolds and need review for required imports/providers.
2. The **Prisma schema in `prisma/schema.prisma` should be verified** against each module’s data needs (Media, Messaging, Safety, Monetization, Gigs, Social Graph). The infrastructure schema likely covers most models, but it needs confirmation.
3. There is a **raw SQL auth migration** in `embr-2-auth-module/migrations/001_create_auth_tables.sql`. Since the repo uses Prisma, this should be reconciled or archived.
4. The **Auth + Users modules were migrated to Prisma**, but other modules still contain mismatched imports or schema assumptions (especially Gigs and Monetization). These need a focused reconciliation pass.
5. The **Auth module depends on an EmailService**; a placeholder was added to keep imports unbroken.

## Scaffold Added

To make the repo runnable, a minimal scaffold has been added:

- `apps/api` (NestJS)
  - `src/main.ts`, `src/app.module.ts`, `nest-cli.json`, `tsconfig.json`
  - Module shells for content, monetization, gigs, social-graph, messaging, safety
  - `PrismaModule` + `PrismaService` at `apps/api/src/modules/prisma`
  - Placeholder `EmailService` and `Wallet` entity
- `apps/web` (Next.js pages router)
  - `src/pages/_app.tsx`, `src/pages/_document.tsx`, `src/pages/index.tsx`
  - `next.config.js`, `tsconfig.json`, `package.json`

## Prisma Migration (Auth/Users)

- Auth and Users services now use `PrismaService` instead of TypeORM repositories.
- Prisma schema updated with auth-related fields and token tables.
- Frontend auth types updated to align with Prisma profile fields (`avatarUrl`, `bannerUrl`, `displayName`).

## Next Steps (Recommended)

1. **Scaffold the base apps**
   - `apps/api` (NestJS)
   - `apps/web` (Next.js)

2. **Wire backend modules**
   - Create `*.module.ts` for each module
   - Import and register modules in `apps/api/src/app.module.ts`
   - Add shared providers (PrismaModule, ConfigModule, JWT, etc.)

3. **Validate Prisma schema**
   - Confirm all module models are present
   - Generate/update migrations

4. **Install dependencies**
   - Backend: NestJS, Prisma, Stripe, AWS SDK, Mux, Socket.io, etc.
   - Frontend: Axios, UI libraries, date utilities

5. **Set up environment variables**
   - Copy `env/.env.development.template` to `.env`
   - Fill in required secrets (Stripe, Mux, AWS, OAuth)

6. **Run infrastructure**
   - `npm run docker:up`
   - `npm run db:migrate:dev`
   - `npm run db:seed`

If you want, I can scaffold the NestJS + Next.js apps and wire everything end-to-end.
