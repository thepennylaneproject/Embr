# Embr Monorepo (Assembled)

This repo has been assembled from the module packages you provided. The source module folders are still present for reference, and the integrated structure now lives under `apps/`, `packages/`, and the infrastructure folders at repo root.

## Structure

```
apps/
  api/
    src/modules/        # Backend module code (NestJS-style)
  web/
    src/                # Frontend components/hooks/pages (Next.js-style)
packages/
  shared/               # Cross-module types + API clients
prisma/                 # Prisma schema (from infrastructure)
docker/                 # Docker dev/prod setup (from infrastructure)
env/                    # Environment templates
scripts/                # DB scripts + seed
```

## Where Things Landed

- **Auth**: `apps/api/src/modules/auth`, `apps/api/src/modules/users`, `apps/web/src/contexts`, `apps/web/src/pages`, `apps/web/src/components/auth`, `apps/web/src/lib`, `apps/web/src/types`
- **Content Core**: `apps/api/src/modules/content`, `apps/web/src/components/content`, `apps/web/src/hooks`, `packages/shared`
- **Media Pipeline**: `apps/api/src/modules/media`, `apps/web/src/components/media`, `apps/web/src/hooks`, `packages/shared`
- **Monetization**: `apps/api/src/modules/monetization`, `apps/web/src/components/monetization`, `apps/web/src/hooks`, `packages/shared`
- **Gigs**: `apps/api/src/modules/gigs`, `apps/web/src/components/gigs`, `apps/web/src/hooks`, `packages/shared`
- **Social Graph**: `apps/api/src/modules/social-graph`, `apps/web/src/components/social`, `apps/web/src/hooks`, `apps/web/src/pages`, `packages/shared`
- **Direct Messaging**: `apps/api/src/modules/messaging`, `apps/web/src/components/messaging`, `apps/web/src/hooks`, `packages/shared`
- **Safety**: `apps/api/src/modules/safety`, `apps/web/src/components/safety`, `apps/web/src/hooks`, `packages/shared`

Detailed integration notes are in `docs/ASSEMBLY_NOTES.md`.

## UI Constitution Checklist
- [ ] Page has title + orientation line (no redundancy)
- [ ] One primary CTA (btn--primary)
- [ ] PageProfileProvider explicit (ledger/form/marketing)
- [ ] Stack/Typo primitives (no raw p-4/text-3xl)
- [ ] 8px rhythm (--space-2/4/6/8)
