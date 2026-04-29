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

These logins exist **only** in a **local** database after running the seed script (`scripts/seed.ts` against your Docker Postgres). They must **never** be deployed to production or reused on any internet-facing environment; rotate credentials and disable seed accounts before going live.

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

# Embr: Agent Guide (Frontend Implementation)

## Mission

Bring the Embr web frontend from “standard browser chrome and ugly” to a coherent, branded, production-grade UI that cleanly wires to the completed backend.

Primary goal: ship the web app as a usable product, not a UI demo.

## Product Snapshot

Embr is a social platform with integrated freelance marketplace, monetization/wallet, messaging, moderation, and media uploads/video processing. The backend exposes REST endpoints plus Socket.io for realtime. :contentReference[oaicite:2]{index=2}

## Architecture Assumptions

- Monorepo with:
  - `apps/api` (NestJS)
  - `apps/web` (Next.js 14, Pages Router, TypeScript)
  - shared packages (types, utils, UI)
    If the repo differs, adapt to existing structure instead of inventing a new one. :contentReference[oaicite:3]{index=3}

## Operating Rules

1. Do not rewrite backend logic. Treat API contracts as source of truth.
2. Do not introduce heavy new dependencies unless needed. Prefer existing stack.
3. Implement UI in vertical slices, each slice includes:
   - page route
   - data fetching + error states
   - loading states
   - empty states
   - accessibility basics (keyboard focus, labels, aria where needed)
4. No dead UI. If a component exists, it must be wired.
5. Maintain consistent patterns: the same UI problem gets the same solution everywhere.

## Definition of Done (Frontend)

A feature slice is “done” when:

- It compiles, runs, and navigates via real routes
- It calls the API successfully (with auth where required)
- It has loading, empty, and error states
- It matches the Embr design system (tokens, type scale, spacing, components)
- It is responsive enough for mobile web
- It is accessible enough to not embarrass us

## Frontend Priorities (Build Order)

### P0: Foundation

- Global layout shell: header, nav, content container
- Auth gating: logged-in vs logged-out routes
- API client: token attach, refresh handling, error normalization
- Design tokens + base components (buttons, inputs, cards, modals, toast)
- Route skeletons for all major product areas

### P1: Social Core

- Feed (list, pagination)
- Post composer (text + media attach)
- Post detail (comments, replies)
- Profile view + edit
- Follow/unfollow, user cards

### P2: Messaging

- Conversation list
- Chat thread UI
- Realtime updates (Socket.io)
- Basic presence indicators if available

### P3: Marketplace + Money

- Gigs list + filters
- Gig detail + apply flow
- Milestones UI
- Wallet summary + transactions
- Tips UI
- Payout request flow

### P4: Safety + Notifications

- Notifications list
- Report content/user modal
- Block/mute UI
- Basic moderation surfaces if role-based access exists

## UX Requirements

- “Calm” UI, not frenetic. Reduce visual noise.
- Show intent: what page is for, what action matters, what happens next.
- Use consistent, human names: “Wallet”, “Gigs”, “Messages”, “Notifications”.
- Prefer progressive disclosure: keep surfaces simple, reveal complexity on demand.

## Testing Expectations (Lightweight)

- Add a small number of smoke tests for route rendering and critical forms if test setup already exists.
- At minimum, ensure no TypeScript errors, no broken routes, no runtime crashes on primary flows.

## Deliverables

- A working Next.js web app with styled, wired, navigable pages
- A UI system that can scale with the product’s breadth
- A short changelog per PR describing what shipped and how to verify

## Copilot specific instructions

### Overview

This repository contains the Copilot audit agent system for **The Pennylane Project**, a portfolio of 11 applications built by Sarah Sahl. The audit agent (`audit-agent`) automatically reviews each app against a curated expectations document, files GitHub Issues for every violation, and posts a summary report when the audit is complete.

---

### The 11 Applications

| App | Directory | Expectations Document |
|---|---|---|
| **Advocera** | `the_penny_lane_project/Advocera/` | `expectations/advocera-expectations.md` |
| **Codra** | `the_penny_lane_project/Codra/` | `expectations/codra-expectations.md` |
| **FounderOS** | `the_penny_lane_project/FounderOS/` | `expectations/founderos-expectations.md` |
| **Mythos** | `the_penny_lane_project/Mythos/` | `expectations/mythos-expectations.md` |
| **Passagr** | `the_penny_lane_project/Passagr/` | `expectations/passagr-expectations.md` |
| **Relevnt** | `the_penny_lane_project/Relevnt/` | `expectations/relevnt-expectations.md` |
| **embr** | `the_penny_lane_project/embr/` | `expectations/embr-expectations.md` |
| **ready** | `the_penny_lane_project/ready/` | `expectations/ready-expectations.md` |
| **Dashboard** | `the_penny_lane_project/dashboard/` | `expectations/dashboard-expectations.md` |
| **Restoration Project** | `the_penny_lane_project/restoration-project/` | `expectations/restoration-project-expectations.md` |
| **sarahsahl.pro** | `the_penny_lane_project/sarahsahl_pro/` | `expectations/sarahsahl-pro-expectations.md` |

---

### How the Audit System Works

#### Automated Weekly Audits

A GitHub Actions workflow (`.github/workflows/scheduled-audit.yml`) runs every **Monday at 9:00 AM UTC** and:

1. Creates a GitHub Issue with title `[Scheduled Audit] Weekly compliance check - <YYYY-MM-DD>`
2. Assigns the issue to `@copilot` with label `audit`
3. Instructs the `audit-agent` to read all 11 expectations documents and audit each app

#### Manual Trigger

Navigate to **Actions → Scheduled Audit** and click **Run workflow** to trigger an audit at any time.

#### What the Agent Does

1. Reads every file in `/expectations/` before beginning
2. Audits each app directory against its corresponding expectations document
3. Files a separate GitHub Issue for each violation found, labeled with severity (`critical`, `warning`, or `suggestion`)
4. Posts a final summary report as a comment on the triggering issue
5. Flags any app that is missing an expectations document

---

### Audit Agent Profile

The full agent profile is at `.github/agents/audit-agent.md`. Global Copilot instructions governing all behavior are at `.github/copilot-instructions.md`.

---

### Expectations Documents

All expectations documents live in `/expectations/`. They are derived from the codebase intelligence reports in `the_penny_lane_project/*/` and reflect the **real architecture, stack, and constraints** of each app. Do not use these documents as generic templates — every rule is sourced from the actual codebase.

#### Adding a New App

1. Add an intelligence report to `the_penny_lane_project/<app-name>/`
2. Create `expectations/<app-name>-expectations.md` following the structure of existing documents
3. Reference the new app in this `AGENTS.md` table
4. The next scheduled audit will automatically include the new app

---

### Output Location

Audit summaries and run artifacts are stored in the `audits/` directory at the repo root.

---

### Important Constraints

- The `audit-agent` **never** modifies expectations documents without explicit human approval
- The `audit-agent` **never** auto-merges or auto-commits code changes
- All issues filed by the agent must be reviewed by Sarah Sahl before any remediation work begins
