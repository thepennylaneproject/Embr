# Embr — Developer Onboarding

## Prerequisites

- **Docker** (for PostgreSQL 16 + Redis 7 containers)
- **Node.js 20**
- `npm ci` from the repo root to install all workspace dependencies

---

## Environment Setup

```bash
cp .env.example .env
```

Open `.env` and review the values.  Most defaults work out of the box for local
development — the only fields you typically need to fill in are the external
service keys (Stripe, MUX, AWS, etc.).

---

## Database Roles — Important

Embr uses **two** PostgreSQL roles:

| Role | Superuser? | Used for | RLS enforced? |
|------|-----------|----------|---------------|
| `embr` | **Yes** | Prisma migrations, seeds | No — superusers bypass RLS |
| `embr_app` | No | NestJS API (`DATABASE_URL`) | **Yes** |

### Why two roles?

PostgreSQL superusers bypass Row-Level Security unconditionally.  Running the
application as `embr` (superuser) would mean that RLS policies added by the
`add_rls_policies` migration are silently ignored during local development and
testing — bugs that only appear in production (where a non-superuser role is
used) would be hidden.

`embr_app` is a least-privilege login role created by the Docker init script
(`docker/postgres/init.sql`) and the RLS migration
(`apps/api/prisma/migrations/20260316000000_add_rls_policies/migration.sql`).
It has `SELECT / INSERT / UPDATE / DELETE` on all public tables, but **no**
superuser rights, so RLS policies apply to every query it makes.

### Connection strings

| Purpose | Variable | Role |
|---------|----------|------|
| API runtime | `DATABASE_URL` | `embr_app` |
| Prisma migrations | `DIRECT_URL` | `embr` |
| Local tests | `TEST_DATABASE_URL` | `embr_app` |

These are already set correctly in `.env.example`.  Do **not** change
`DATABASE_URL` to use the `embr` superuser — doing so breaks RLS coverage.

---

## Starting Infrastructure

```bash
# Start PostgreSQL and Redis (runs init.sql automatically on first start)
docker compose -f docker/docker-compose.yml up -d postgres redis

# Wait for Postgres to be healthy, then run Prisma migrations
npm run db:migrate:deploy

# (Optional) seed the database with test accounts
npx ts-node scripts/seed.ts
```

After the first `docker compose up`, the init script creates:
- `embr` database (owned by the `embr` superuser)
- `embr_app` login role (password `embr_app_dev_password` locally)
- `embr_test` database for local test runs (also accessible by `embr_app`)

---

## Running the Applications

```bash
# API — transpile-only (pre-existing TS strict errors prevent nest build)
cd apps/api
npx ts-node --transpile-only -r tsconfig-paths/register src/main.ts

# Web (in a separate terminal, from repo root)
npm run dev:web
```

---

## Test Accounts (from seed)

| Email | Password | Role |
|-------|----------|------|
| admin@embr.app | test1234 | ADMIN |
| creator@embr.app | test1234 | CREATOR |
| user@embr.app | test1234 | USER |

---

## CI / RLS Verification

The CI workflow (`.github/workflows/ci.yml`) includes an **RLS smoke check**
that:

1. Creates the `embr_app` role in the CI Postgres service
2. Runs all Prisma migrations (which enables RLS on all tables)
3. Connects as `embr_app` **without** setting `app.current_user_id`
4. Asserts that `SELECT COUNT(*) FROM "User"` returns `0`

This confirms that RLS is active and that unauthenticated queries return no
rows — matching the policy defined in the migration.

---

## Known Issues

- **666+ TypeScript strict errors** in `apps/api` prevent `nest build` / `tsc`.
  This is tracked as technical debt.  Use `--transpile-only` for local
  development.
- **ESLint config** for the web app does not resolve `@embr/config/eslint`
  cleanly with the older config loader.  Lint is non-blocking in CI.
- **Redis health check** may log one failure on startup if the auth password
  handshake races — the app still starts correctly.
