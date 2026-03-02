# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Embr is a creator-focused social media + freelance marketplace monorepo (npm workspaces + Turborepo). It has two main services: a NestJS API (`apps/api`, port 3003) and a Next.js web frontend (`apps/web`, port 3004). Infrastructure (PostgreSQL 16, Redis 7) runs via Docker Compose.

### Prerequisites

Docker must be installed and running (needed for PostgreSQL and Redis containers). The VM snapshot includes Docker configured with `fuse-overlayfs` and `iptables-legacy`.

### Starting infrastructure

```bash
sudo dockerd &>/dev/null &   # if Docker daemon isn't running
sleep 3
sudo docker compose -f docker/docker-compose.yml up -d postgres redis
```

Wait for containers to be healthy before running Prisma commands.

### Environment variables

A pre-existing `DATABASE_URL` env var in the Cloud VM points to an external database. You **must** override it in your shell session with the local dev values from the `.env` file at the repo root (see `.env.example` for the template). These overrides are also persisted in `~/.bashrc`.

The `.env` files at the repo root and in `apps/api/` and `apps/web/` are pre-configured for local development with the Docker Compose service ports (PostgreSQL on 5433, Redis on 6380).

### Running the API

The API has many pre-existing TypeScript strict-mode errors (666+), so `nest build` and `nest start --watch` fail. Use transpile-only mode:

```bash
cd apps/api
npx ts-node --transpile-only -r tsconfig-paths/register src/main.ts
```

### Running the web app

```bash
npm run dev:web   # from repo root, starts Next.js on port 3004
```

### Running both together

Do NOT use `npm run dev` (the root script) as it tries `nest start --watch` which fails due to TypeScript errors. Start the API and web separately as described above.

### Test accounts (from seed)

| Email | Password | Role |
|---|---|---|
| admin@embr.app | test1234 | ADMIN |
| creator@embr.app | test1234 | CREATOR |
| user@embr.app | test1234 | USER |

### Known issues

- **ESLint**: No ESLint config exists for the API (`apps/api`). The web app's config references `@embr/config/eslint` which doesn't resolve properly with ESLint's config loader. Lint commands fail.
- **Tests**: `ts-jest` is not installed, so `npm test` in the API fails. No test infrastructure is configured.
- **TypeScript strict errors**: 666+ type errors in the API prevent `nest build`. Use `--transpile-only` for development.
- **Redis auth**: The Redis container uses password `embr_redis_password` on port 6380. The RedisService may log a health check failure if the password isn't passed correctly, but the app still starts.

### Prisma

Schema is at `apps/api/prisma/schema.prisma`. Generate client and push schema:

```bash
npx prisma generate --schema apps/api/prisma/schema.prisma
npx prisma db push --schema apps/api/prisma/schema.prisma
```

Seed the database: `npx ts-node scripts/seed.ts`

### API authentication

The API uses JWT via httpOnly cookies. For programmatic testing, extract the `accessToken` cookie and use it as a Bearer token. See `apps/api/src/core/auth/auth.controller.ts` for the login flow.
