# Investor Readiness Audit — Embr Platform
**Date:** 2026-03-16  
**Auditor:** Automated Technical Due Diligence  
**Repo:** `thepennylaneproject/Embr` (branch: `main`, HEAD: `c73241e`)  
**Scope:** Full codebase, git history, CI/CD, dependencies, documentation

---

## REPO HYGIENE

### 1. README.md

**Exists:** Yes (`/workspace/README.md`, 48 lines)

**Assessment: Adequate but incomplete for investor review.**

- **Product description:** Pass. "Embr is a platform built for independent creators: a social media layer, a freelance gig marketplace, and a monetization stack in one place." One sentence, clear.
- **Setup instructions:** Pass. Includes Docker prerequisite, `npm install`, `.env.example` copy step, infrastructure startup commands, and separate API/web startup instructions.
- **Environment variables:** Pass. References `.env.example` but does not enumerate key variables inline. A reader must open a separate file to know what's required.
- **Live demo link:** **FAIL. No demo URL, no screenshots, no hosted environment linked anywhere in the repo.** For a product seeking investment, this is a significant omission — an investor cannot see the product without running it locally.
- **Currency:** Mostly current. One inaccuracy: README states "Next.js 14 (App Router)" but `apps/web` uses the **Pages Router**, not App Router. Minor but signals incomplete review before pushing.
- **License contradiction:** README footer states "All rights reserved — © The Penny Lane Project". `package.json` declares `"license": "MIT"`. No `LICENSE` file exists. These three signals are mutually contradictory. An investor's legal team will flag this immediately.

### 2. .gitignore

**Exists:** Yes, comprehensive (100 lines).

All standard exclusions are present: `node_modules/`, `dist/`, `build/`, `.next/`, `*.log`, `.DS_Store`, `.env`, `.env.*.local`, `coverage/`, `.cache/`, `.turbo/`, `.vercel`. The `.env` exclusion is correctly configured with a `!.env.example` carve-out.

**No committed secrets, build artifacts, or node_modules found in the working tree.**

One historical note: per `docs/SECURITY.md`, a `.env` file with live production credentials *was* committed to git history and removed via `git filter-repo` on 2026-03-10. The working tree is clean, but all credentials that were in that file must be considered compromised until rotated (see Security section).

### 3. LICENSE File

**FAIL: No LICENSE file exists at the repository root.**

- `package.json` (`/workspace/package.json`, line 76): `"license": "MIT"`
- `README.md` (line 47): `"All rights reserved — © The Penny Lane Project"`
- `packages/music-sdk/package.json` (line 15): `"license": "MIT"`

Three conflicting signals. Unlicensed or ambiguously licensed code is a legal red flag for any investor conducting due diligence. Fix: decide on a license, create the file, and align all references.

### 4. package.json

**Root `/workspace/package.json`:**

| Field | Value | Issue |
|-------|-------|-------|
| `name` | `embr-infrastructure` | Misleading — the package name describes infra tooling, not the product. Should be `embr` or `embr-platform`. |
| `version` | `1.0.0` | Inconsistent with `apps/api` and `apps/web` both at `0.1.0`. Root claiming `1.0.0` while subpackages are pre-1.0 is contradictory. |
| `author` | `"Embr Team"` | Not a named individual or company. Investors want a clear legal owner. |
| `license` | `"MIT"` | Contradicts README "All rights reserved". |
| `description` | `"Complete infrastructure setup for Embr platform"` | Describes DevOps tooling, not the product. Should reflect what Embr is as a product. |

Runtime dependencies (`bcrypt`, `redis`, `@prisma/client`) are listed in the **root workspace** `dependencies` block rather than in the apps that consume them. This causes incorrect hoisting behavior and makes it unclear which app actually depends on these packages.

---

## SECURITY

### 5. Hardcoded Secrets and Historical Exposure

**CRITICAL — Production credentials were committed to git history.**

Per `docs/SECURITY.md`: on 2026-03-10, a `.env` file containing the following production credentials was committed and subsequently removed via `git filter-repo`:

- PostgreSQL database connection string (with password)
- JWT secret keys (access + refresh)
- Redis authentication token
- AWS Access Key ID and Secret Access Key
- Stripe live API keys (`sk_live_*` and `whsec_*`)
- Mux video processing token and secret
- Google OAuth client ID and secret
- SMTP credentials

`docs/SECURITY.md` explicitly states: **"All production secrets MUST be rotated immediately"** — and lists this as a manual action item with no confirmed completion date. If these credentials have not been rotated, every service the platform touches is currently compromised.

**Current codebase — development credentials hardcoded in committed files:**

| File | Line | Credential |
|------|------|------------|
| `docker/docker-compose.yml` | 13 | `POSTGRES_PASSWORD: embr_dev_password` |
| `docker/docker-compose.yml` | 33 | `redis-server --requirepass embr_redis_password` |
| `docker/docker-compose.yml` | 66 | `REDIS_HOSTS=local:embr_redis:6379:0:embr_redis_password` |
| `scripts/seed-simple.js` | 7 | `postgresql://embr:embr_dev_password@localhost:5433/embr` (fallback default) |

These are local-only Docker dev credentials, which is an acceptable pattern. However, they must never match any production values.

**SQL Injection — open vulnerability, tracked but unfixed:**

| File | Lines | Issue |
|------|-------|-------|
| `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts` | 479–494 | `${userId}` and `${limit}` interpolated directly into `$queryRaw` template literal |
| `apps/api/src/verticals/feeds/social-graph/services/user-discovery.service.ts` | 501–517 | Same pattern |

Tracked as `audits/findings/sec-002.md`, status "READY TO FIX (~1 hr)". It has not been fixed. This is an exploitable SQL injection vector in production code.

**IDOR in wallet endpoints — open, unfixed:**

Tracked as `audits/findings/sec-005.md`: wallet endpoints perform no ownership check, allowing any authenticated user to read or manipulate another user's wallet. Status: "READY TO FIX (1–2 hrs)".

**Over-exposed user data in API responses — open, unfixed:**

Tracked as `audits/findings/sec-004.md`: API responses return sensitive fields (email, balance, full wallet data) to callers who should not receive them. Status: "READY TO FIX (2–3 hrs)".

### 6. Environment Variables

**Pass for template existence.** Four `.env.example` files exist:
- `/.env.example` (151 lines, comprehensive)
- `apps/api/.env.example`
- `apps/web/.env.example`
- `apps/mobile/.env.example`

All use placeholder values, no real credentials. `process.env` usage is consistent throughout the codebase.

**Two issues in `.env.example`:**
- `COOKIE_SECURE=true` appears twice (lines ~21 and ~26 of `/.env.example`). Sloppy.
- `FRONTEND_URL` and `APP_URL` are duplicated in `apps/api/.env.example`.

### 7. Exposed Service Keys in Client-Side Code

**Pass.** No Supabase keys, Stripe publishable keys, or other credentials found hardcoded in client-side code. Stripe publishable key is correctly passed via `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` environment variable. The `.env.example` placeholder reads `pk_test_` (incomplete test key, not a real credential).

**Flag:** `packages/music-sdk/package.json` references `"repository": { "url": "https://github.com/embr/music-sdk" }` — a GitHub URL that does not appear to be a real public repository. If an investor or technical reviewer attempts to follow this link, it will 404, undermining credibility.

### 8. Public API Routes Without Authentication

**Partial concern.** The API uses NestJS `@nestjs/throttler` for rate limiting and JWT guards. However:

- `apps/api/src/core/notifications/notifications.controller.ts`, line 133: `// TODO: Add admin guard` — an admin endpoint exists without the admin authorization guard applied. This is an open TODO in production code.
- `apps/api/src/core/monetization/controllers/stripe-connect.controller.ts`, line 82: `// TODO: Add admin guard or allow users to delete own account` — same issue on a Stripe Connect deletion endpoint.
- No per-route rate limiting granularity is visible in a surface scan — the global throttler configuration would need manual review to confirm per-endpoint limits are appropriate.

---

## DOCUMENTATION

### 9. Inline Code Documentation

**Inadequate at scale.** The codebase has inconsistent inline documentation:

- NestJS API controllers use `@nestjs/swagger` decorators (`@ApiOperation`, `@ApiResponse`) which doubles as documentation, but coverage is uneven.
- No JSDoc on service methods across most of `apps/api/src/`.
- Completely undocumented files (no comments whatsoever):
  - `apps/api/src/core/cache/cache.service.ts`
  - `apps/api/src/core/analytics/analytics.service.ts`
  - `apps/web/src/hooks/useMessaging.ts`
  - `apps/web/src/hooks/useGig.ts`
  - `apps/web/src/hooks/useSafety.ts`
  - All files in `packages/creator-tools/src/`

The `apps/api/src/music/` directory (musicController.ts, musicService.ts, routes/index.ts) contains large commented-out code blocks indicating the music API integration was started and abandoned — no documentation explains why or what replaced it.

### 10. TypeScript `any` Usage

**Heavy usage signals incomplete type implementation.**

| Location | `any` Count |
|----------|------------|
| `apps/api/src/` | ~107 instances across 55 files |
| `apps/web/src/` | ~152 instances across 63 files |
| `packages/` | ~8 instances across 4 files |
| **Total** | **~267 instances** |

Worst offenders:

| File | Count |
|------|-------|
| `apps/web/src/hooks/useSafety.ts` | 17 |
| `apps/web/src/hooks/useMessaging.ts` | 13 |
| `apps/web/src/hooks/useGig.ts` | 13 |
| `apps/web/src/hooks/useMarketplace.ts` | 8 |
| `apps/web/src/shared/api/safety.api.ts` | 8 |
| `apps/api/src/core/media/controllers/mux-webhook.controller.ts` | 10 |
| `apps/api/src/verticals/feeds/social-graph/services/user-discovery.service.ts` | 8 |

The web ESLint config (`apps/web/.eslintrc.json`) sets `"@typescript-eslint/no-explicit-any": "error"` — meaning the codebase violates its own lint rules in 152+ places across the web app alone. The API config downgrades this to `"warn"`.

Additionally, 666+ TypeScript strict-mode errors prevent `nest build` from succeeding. The API cannot be compiled in strict mode. The project runs only via `--transpile-only` (bypassing type checking). This is documented in `AGENTS.md` as a "known WIP" but is a fundamental quality signal.

### 11. CHANGELOG

**FAIL: No CHANGELOG.md exists anywhere in the repository.** This is a recommendation-level gap, not a blocker, but it signals that version history and release discipline are absent.

The `audits/` directory contains structured audit runs with detailed findings, which demonstrates process discipline, but this is internal tooling — not a public-facing release record.

### 12. Naming Clarity

**Pass.** Component and function names are generally descriptive and intention-revealing. The vertical-slice architecture in the API (`verticals/feeds/`, `verticals/messaging/`, `core/monetization/`) is logical. The `packages/` naming (`@embr/types`, `@embr/utils`, `@embr/music-sdk`) is consistent.

Minor flag: three files with `.disabled.ts` extension in `apps/api/src/core/monetization/services/`:
- `marketplace-payment.service.disabled.ts`
- `licensing-payment.service.disabled.ts`
- `gigs-payment.service.disabled.ts`

Entire service implementations commented out and left in the tree. These are dead code artifacts that should be either fully deleted or restored.

---

## CODE QUALITY

### 13. Linting Configuration

**ESLint: Present. Prettier: Absent.**

| Location | Config | Status |
|----------|--------|--------|
| `apps/api/` | `.eslintrc.js` — `@typescript-eslint/recommended` | Functional |
| `apps/web/` | `.eslintrc.json` — extends `@embr/config/eslint` + `next/core-web-vitals` | **Broken** — `@embr/config/eslint` cannot be resolved because `packages/config/` has no installed dependencies. Confirmed broken per `AGENTS.md`. |
| Root | None | No root-level ESLint config |
| All | No Prettier config | No `.prettierrc`, no `prettier.config.js` anywhere |

The web app's lint command (`next lint`) fails due to the unresolvable `@embr/config/eslint` extension. An investor running `npm run lint` in `apps/web/` gets an error.

No pre-commit hooks that enforce linting are active. The `.pre-commit-config.yaml` referenced in `docs/SECURITY.md` was added for secret detection only.

### 14. Dead Code and TODOs

**Significant volume of dead code and unfinished work markers:**

**TODO/FIXME Comments:**

| File | Line | Content |
|------|------|---------|
| `apps/api/src/core/notifications/notifications.controller.ts` | 120 | `// TODO: Fetch from user profile or settings` |
| `apps/api/src/core/notifications/notifications.controller.ts` | 133 | `// TODO: Add admin guard` ← **security gap** |
| `apps/api/src/core/media/services/media-notification.service.ts` | 30, 77, 124 | `// TODO: Implement notification channels:` (3 instances) |
| `apps/api/src/core/monetization/controllers/stripe-connect.controller.ts` | 82 | `// TODO: Add admin guard or allow users to delete own account` ← **security gap** |
| `apps/api/src/core/monetization/controllers/payout.controller.ts` | 115 | `// TODO: Implement single payout fetch with permission check` |
| `apps/web/src/components/onboarding/CreatorOnboarding.tsx` | 41 | `// TODO: Load from API if user has completed onboarding steps` |
| `apps/web/src/pages/api/analytics/events.ts` | 35 | `// TODO: Store events in database` |

The analytics events API route collects events but explicitly does not store them. This means the analytics pipeline is non-functional in production.

**Dead Code Files (entirely disabled implementations):**

- `apps/api/src/core/monetization/services/marketplace-payment.service.disabled.ts`
- `apps/api/src/core/monetization/services/licensing-payment.service.disabled.ts`
- `apps/api/src/core/monetization/services/gigs-payment.service.disabled.ts`
- `apps/api/src/music/controllers/musicController.ts` — large commented-out block
- `apps/api/src/music/routes/index.ts` — large commented-out block
- `apps/api/src/music/services/musicService.ts` — large commented-out block

**Additional large commented-out blocks (50+ lines each):**
- `apps/api/src/verticals/feeds/content/services/scheduled-posts.service.ts`
- `apps/api/src/verticals/feeds/content/services/trending.service.ts`
- `apps/api/src/core/notifications/notifications.gateway.ts`
- `apps/api/src/core/notifications/notifications.service.ts`
- `apps/web/src/shared/api/monetization.api.ts`
- `apps/web/src/shared/api/gigs.api.ts`
- `apps/web/src/shared/types/monetization.types.ts`

### 15. Error Handling in Async Operations

**Present in most places, missing in several:**

Bare `.then()` calls without `.catch()` found in production web pages:

| File | Lines | Issue |
|------|-------|-------|
| `apps/web/src/pages/groups/[id].tsx` | 65, 72, 78, 83, 88 | Five consecutive `useEffect` hooks with `.then()` but no `.catch()` — failures are silently swallowed |
| `apps/web/src/pages/mutual-aid/[id].tsx` | 172 | `completeResponse(...).then(loadPost)` — no `.catch()` on an action handler |
| `apps/api/src/core/notifications/notifications.gateway.ts` | 254 | `.then((count) => { ... })` — no `.catch()` in a WebSocket context |

In the groups page, five different data-loading paths (posts, members, events, alerts, polls) all fail silently. Users see blank sections with no error indication.

### 16. `console.log` in Production Code

**9 instances found in production web source files:**

| File | Lines | Content |
|------|-------|---------|
| `apps/web/src/hooks/useMessaging.ts` | 99, 105, 119, 155, 177 | WebSocket connect/disconnect/message/typing events |
| `apps/web/src/contexts/AuthContext.tsx` | 78 | `'Token refreshed successfully'` |
| `apps/web/src/components/messaging/DMInbox.tsx` | 27, 32, 36 | New message/message read/typing indicator |
| `apps/web/src/pages/api/analytics/events.ts` | 39 | `[Analytics] Received ${events.length} events` |

The API correctly uses NestJS's `Logger` service instead of `console.log`. The web app did not follow the same discipline.

### 17. Copy-Paste Code

**Moderate.** The pattern is most visible in the hooks layer — `useMessaging.ts`, `useGig.ts`, `useSafety.ts`, `useGroups.ts`, `useMutualAid.ts` all follow nearly identical fetch-state-error patterns that could be extracted into a `useFetch` or `useApiQuery` utility. The `shared/api/` layer abstracts HTTP calls reasonably, but the hooks above each re-implement loading/error/data state management without a shared abstraction.

Not a blocking issue, but a scaling concern.

---

## CI/CD & DEPLOYMENT

### 18. CI/CD Pipeline

**Exists: `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`.**

CI pipeline (`ci.yml`):
- Runs on push/PR to `main` and `develop`
- Spins up Postgres 16 and Redis 7 as services
- Runs `npm ci`, Prisma generate, `db:migrate:deploy`, schema validate, TypeScript check (web only), web build
- **Does NOT run API build** (avoids the known 666+ TypeScript error failure)
- Has a security job that runs Snyk — but only if `SNYK_TOKEN` secret is configured. If the secret is absent, the job silently passes. This means security scanning is not guaranteed on every run.

**CRITICAL — Deploy pipeline is broken by design:**

`.github/workflows/deploy.yml`, line 25:
```
run: npm --prefix apps/api run build
```

`apps/api`'s `build` script runs `nest build`, which **fails** due to 666+ TypeScript strict-mode errors. This means every push to `main` triggers a deploy pipeline that cannot complete the build step. The API has never been deployable via the documented CI/CD pipeline. It can only be deployed manually using `--transpile-only`.

### 19. Deployment Documentation

**Partially documented.** The README states "Web → Vercel; API → Docker Compose (self-hosted)" and the deploy workflow confirms:
- Web: `npx vercel --prod` (Vercel CLI)
- API: SSH into remote host, `git pull origin main`, `docker compose up`

What is not documented: the remote host configuration, what environment variables are injected into production, how `docker-compose.prod.yml` differs from `docker-compose.yml`, or what the Vercel project configuration looks like. The `docker-compose.prod.yml` file referenced in the deploy workflow is not committed to the repository — it exists only on the remote server.

### 20. Environment Separation

**Weak.** The codebase acknowledges `NODE_ENV=development` vs production but:
- No staging environment is defined or documented anywhere
- `docker-compose.yml` includes development-only admin tools (Adminer on `:8080`, Redis Commander on `:8082`, MailHog on `:8025`, LocalStack on `:4566`) — if `docker-compose.prod.yml` is derived from this file, these tools may be exposed in production
- `.env.example` has a single set of variables with no environment-specific variants

### 21. Build from Clean Install

**Web build:** Likely passes (CI pipeline runs it successfully).

**API build:** **FAILS.** `nest build` hits 666+ TypeScript strict-mode errors and cannot complete. This is an explicitly documented known issue. The project runs in development via `npx ts-node --transpile-only` which bypasses all type checking. A technical due diligence reviewer who runs `npm install && npm run build` will immediately see a broken build.

---

## DEPENDENCY MANAGEMENT

### 22. Dependency Vulnerabilities

`npm audit` results (run 2026-03-16):

| Severity | Count |
|----------|-------|
| **Critical** | **5** |
| High | 23 |
| Moderate | 26 |
| Low | 7 |

**Critical vulnerabilities:**

| Package | CVE | CVSS | Description |
|---------|-----|------|-------------|
| `next@14.2.5` | GHSA-f82v-jwr5-mffw | **9.1** | **Authorization Bypass in Next.js Middleware** — allows unauthenticated access to protected routes |
| `socket.io-parser` | GHSA-qm95-pgcg-qqfq | **9.8** | Insufficient validation when decoding Socket.IO packets (RCE-class) |
| `xmlhttprequest-ssl` | GHSA-h4j5-c7cj-74xg | **9.8** | Arbitrary Code Injection |
| `xmlhttprequest-ssl` | GHSA-72mh-269x-7mh5 | **9.4** | Improper Certificate Validation |
| `fast-xml-parser` | GHSA-m7jm-9gc2-mpf2 | **9.3** | Entity encoding bypass via regex injection in DOCTYPE entity names |

The Next.js middleware authorization bypass (CVSS 9.1) is the most operationally dangerous — it affects the web frontend's auth gating. `next@14.2.5` needs to be updated to at minimum `14.2.25` to patch this specific CVE.

`socket.io-parser` and `xmlhttprequest-ssl` are in the `apps/mobile` dependency chain via `react-native-socket.io-client` — a non-standard/unofficial package. The canonical package `socket.io-client` should be used instead.

**High vulnerabilities (selected):**

| Package | Issue |
|---------|-------|
| `next@14.2.5` | Multiple additional high-severity CVEs (DoS via Server Components, Cache Poisoning, SSRF) |
| `@nestjs/platform-express` | Vulnerable `multer` dependency |
| `bcrypt` | Vulnerable `@mapbox/node-pre-gyp` → `tar` chain |
| `@nestjs/cli` | Multiple vulnerabilities via `webpack`, `glob`, `inquirer` |

### 23. Lockfile

**`package-lock.json` is committed.** Pass.

Additional lockfile at `the_penny_lane_project/Relevnt/package-lock.json` — also committed.

---

## GIT DISCIPLINE

### 24. Commit Message Quality

**Last 30 commits (from `git log --oneline`):**

The commit history shows a mix of automated agent commits and hand-written commits. Quality is uneven but not amateur:

**Good commits:**
- `feat(relevnt): scaffold Relevnt app with ApplicationsPage empty & error states`
- `security(sec-001): Rotate secrets and implement pre-commit hooks`
- `fix(f-log-001): Implement getUnreadCountForConversation method`
- `security(sec-003): Add COOKIE_SECURE configuration and auth fallback`
- `fix(PLP-13): normalize Authorization header casing across API handlers`

**Weak commits:**
- `2f0369e Initial plan` — a commit with this message exists on main. "Initial plan" describes an intention, not a code change.
- `c562e2e Initial plan` — a second commit with the same message, a few commits above it.
- `07afdc5 lyra updates` — zero information about what changed.
- `34cf34d docs(audit-findings): Add comprehensive findings index` — the word "comprehensive" in a commit message is a red flag; it suggests the author is editorializing rather than describing.

Many commits appear to be from automated Cursor AI agents (the `cursor/PLP-*` branch naming pattern and `audits/` directory confirm this). An investor reviewing the commit history will see that significant portions of the codebase were written or modified by AI agents, which raises questions about human review and accountability.

**Branching strategy:** Inconsistent. Feature branches follow `cursor/PLP-<N>-<description>` pattern for AI agent work. Human commits appear to go directly to `main`. No evidence of a PR-required workflow or branch protection on `main`.

**Massive bundled commits:** `6856fa0 4 P0 fixes` — four separate security/functionality fixes bundled into one commit. Makes bisecting and rollback harder.

### 25. Stale Branches

Remote branches still present:

| Branch | Status |
|--------|--------|
| `cursor/PLP-13-authorization-header-consistency-8bf8` | Merged (PR #46 or related), not deleted |
| `cursor/PLP-15-job-alerts-profile-aggregation-de07` | Merged, not deleted |
| `cursor/PLP-23-copy-store-consolidation-201e` | Active or recently merged |
| `cursor/PLP-78-postgresql-rls-policies-2570` | Active or recently merged |
| `copilot/audit-repo-hygiene` | Stale, purpose unclear |
| `copilot/run-audit` | Stale, purpose unclear |

No branch cleanup has occurred. For a repo being shown to investors, stale branches signal lack of housekeeping.

### 26. Secrets in Git History

Per `docs/SECURITY.md`, production credentials were previously committed and removed via `git filter-repo`. The working tree is clean. However:

- The `git filter-repo` operation rewrites history. If any forks, clones, or CI artifacts existed before the purge, those copies still contain the secrets.
- `docs/SECURITY.md` itself documents the exact list of what was exposed — which is helpful for rotation tracking but means the compromise scope is also documented in plain text in the repo.
- The security document was committed as `2bd8d65 security(sec-001): Rotate secrets and implement pre-commit hooks` — this commit message accurately identifies what was done, but the SECURITY.md file still lists the rotation as an "IMMEDIATE (Today)" action item with no confirmation of completion.

---

## PORTFOLIO COHESION

### 27. Portfolio Alignment

**Pass with caveats.** The README correctly situates Embr within "The Penny Lane Project" with a link to `thepennylaneproject.org`. The `AGENTS.md` file documents the portfolio context explicitly.

However, the root `package.json` `name` field is `"embr-infrastructure"` which sounds like DevOps tooling rather than a creator platform product. An investor reviewing package metadata first would be confused about what this repository actually is.

### 28. Tech Stack Consistency

The primary Embr stack (Next.js 14, NestJS 10, PostgreSQL/Prisma, TypeScript, Tailwind) is coherent and represents a conventional, defensible TypeScript full-stack choice.

Inconsistencies that need explanation:

- **`bcrypt` vs `bcryptjs` split**: Root workspace and `packages/auth` use `bcrypt` (native C bindings). `apps/api` uses `bcryptjs` (pure JavaScript). Both are installed. This is either redundant or could cause subtle hashing differences.
- **Mobile app**: `apps/mobile` uses `react-native-socket.io-client` (unofficial) instead of the standard `socket.io-client`. This package carries critical CVEs (see above) and is not maintained by Socket.io.
- **`the_penny_lane_project/Relevnt/`**: A completely separate Vite/React app living inside this monorepo. It has its own `package.json`, its own `package-lock.json`, and appears unrelated to Embr's NestJS/Next.js stack. No documentation explains why it is here or how it relates to the Embr platform.

### 29. Live Demo

**FAIL. No live URL linked anywhere in the repository.** No demo environment, no hosted staging link, no screenshots in the README or `docs/`. Investors expect to be able to interact with a product before committing time to a deep technical review. The absence of a visible, running product is the single highest-friction gap for investor engagement.

---

## INVESTOR SIGNALS

### 30. Risk Summary

#### CRITICAL — Must fix before investor review

| # | Issue | Location | Fix Time |
|---|-------|----------|----------|
| C-1 | **Production secrets previously committed to git — rotation status unconfirmed.** All credentials exposed (DB, JWT, Redis, AWS, Stripe, Mux, Google OAuth, SMTP) must be treated as compromised until rotation is confirmed in writing. | `docs/SECURITY.md` | Immediate |
| C-2 | **Critical CVE: Next.js middleware authorization bypass (CVSS 9.1, GHSA-f82v-jwr5-mffw).** Auth gating on the web frontend can be bypassed by unauthenticated users. `next@14.2.5` → must upgrade to ≥ `14.2.25`. | `apps/web/package.json` | < 1 hour |
| C-3 | **Critical CVE: socket.io-parser insufficient packet validation (CVSS 9.8, GHSA-qm95-pgcg-qqfq).** In `apps/mobile` via unofficial `react-native-socket.io-client`. Replace with official `socket.io-client`. | `apps/mobile/package.json` | < 2 hours |
| C-4 | **SQL injection via raw string interpolation** in `follows.service.ts` (lines 479–494) and `user-discovery.service.ts` (lines 501–517). Tracked as `sec-002`, marked "READY TO FIX (~1 hr)" — not yet fixed. | `apps/api/src/verticals/feeds/social-graph/services/` | ~1 hour |
| C-5 | **IDOR on wallet endpoints** — no ownership check allows any authenticated user to access other users' wallet data. Tracked as `sec-005`, marked "READY TO FIX (1–2 hrs)" — not yet fixed. | `apps/api/` | ~2 hours |
| C-6 | **API build is broken.** `deploy.yml` calls `nest build` which fails due to 666+ TypeScript errors. The API has never been continuously deployable via the documented pipeline. | `apps/api/`, `.github/workflows/deploy.yml` | Days (requires systematic TS error resolution or a `--transpile-only` deploy strategy) |
| C-7 | **No LICENSE file.** Contradictory license signals across README, root `package.json`, and `packages/music-sdk/package.json`. Legal ambiguity is a deal blocker. | Repo root | < 30 minutes |

#### RECOMMENDED — Fix to signal engineering maturity

| # | Issue | Location |
|---|-------|----------|
| R-1 | Over-exposed user data in API responses (`sec-004`) — email addresses, balances, and private fields returned to unauthorized callers. | `apps/api/src/` |
| R-2 | Missing admin guards on two production endpoints (`notifications.controller.ts:133`, `stripe-connect.controller.ts:82`). | `apps/api/src/` |
| R-3 | 9 `console.log` statements in production web source code. | `apps/web/src/hooks/useMessaging.ts`, `AuthContext.tsx`, `DMInbox.tsx`, `analytics/events.ts` |
| R-4 | Web ESLint config is broken (`@embr/config/eslint` does not resolve). `npm run lint` in `apps/web/` fails. | `apps/web/.eslintrc.json`, `packages/config/` |
| R-5 | No Prettier configuration anywhere in the repository. Inconsistent formatting signals absent code review standards. | Repo-wide |
| R-6 | 267 uses of TypeScript `any` across the codebase, in a project that has `"@typescript-eslint/no-explicit-any": "error"` in its own lint config. | `apps/web/src/hooks/`, `apps/api/src/` |
| R-7 | 5+ bare `.then()` without `.catch()` in production web pages causing silent failures. | `apps/web/src/pages/groups/[id].tsx`, `mutual-aid/[id].tsx` |
| R-8 | Dead code: three fully-commented `.disabled.ts` payment service files and large commented-out blocks in 10+ source files. | `apps/api/src/core/monetization/services/`, `apps/api/src/music/` |
| R-9 | Analytics event ingestion endpoint does not store events (`// TODO: Store events in database`). Analytics pipeline is non-functional. | `apps/web/src/pages/api/analytics/events.ts:35` |
| R-10 | `npm audit` reports 5 critical + 23 high vulnerabilities. Even after fixing C-2 and C-3, the remaining critical/high count needs a resolution plan. | `package.json`, `apps/api/package.json`, `apps/mobile/package.json` |
| R-11 | Stale remote branches not cleaned up after merge. | Git remote |
| R-12 | `bcrypt`/`bcryptjs` split across the monorepo — inconsistent, one should be chosen and used everywhere. | `package.json`, `apps/api/package.json`, `packages/auth/package.json` |

#### POLISH — Nice-to-have improvements

| # | Issue |
|---|-------|
| P-1 | Add a CHANGELOG.md or adopt conventional commits with automated changelog generation. |
| P-2 | Add screenshots or a live demo link to README.md. |
| P-3 | Fix duplicate keys in `.env.example` (`COOKIE_SECURE` appears twice, `FRONTEND_URL`/`APP_URL` duplicate in `apps/api/.env.example`). |
| P-4 | Rename root `package.json` `name` from `embr-infrastructure` to `embr` or `embr-platform`. |
| P-5 | Fix the `packages/music-sdk/package.json` `repository.url` — it references `github.com/embr/music-sdk` which does not exist publicly. |
| P-6 | Document what `the_penny_lane_project/Relevnt/` is doing inside the Embr monorepo. |
| P-7 | README states "App Router" but the web app uses Pages Router. Fix the inaccuracy. |
| P-8 | Clean up `audits/` directory — it contains internal tooling, AI agent prompts, and run artifacts. These should not be the first thing a reviewer sees at the repo root. |
| P-9 | Remove or document the three `.disabled.ts` files; commit them to history with a clear explanation or delete them. |
| P-10 | Add branch protection on `main` (require PR reviews before merge). |
| P-11 | Set up `SNYK_TOKEN` in GitHub Actions secrets so the security scan is not silently skipped on every CI run. |

---

### 31. Investor Readiness Score

**Score: 3.5 / 10**

**Justification:**

The project has real infrastructure: CI/CD pipelines exist, a comprehensive `.env.example` is present, rate limiting and JWT auth are implemented, the architecture is defensible (Turborepo monorepo, NestJS/Next.js/Prisma), and there is documented process discipline (audit tracking, findings with severity ratings and fix-time estimates). These are signs of a developer who has thought about production engineering.

However, the score is held down by a cluster of issues that would halt any serious technical due diligence:

1. **Production secrets were committed to git.** Even after removal via `git filter-repo`, the rotation status is unconfirmed per the project's own documentation. For a platform handling Stripe payments and AWS resources, this is a potential material liability.
2. **The API build is broken.** A reviewer who runs `npm run build` gets a failure. A CI pipeline that claims to deploy the API calls a build command that cannot succeed. This is the most visible signal of accumulated technical debt.
3. **Five critical CVEs** in production dependencies, including a Next.js middleware authorization bypass (CVSS 9.1) and socket.io-parser arbitrary packet injection (CVSS 9.8). These are not theoretical — they affect the current deployed version.
4. **No LICENSE file**, with contradictory signals elsewhere. Legal ambiguity around IP ownership is a non-starter for investment.
5. **No live demo.** Without a running product to look at, investors are being asked to invest in source code and documentation alone.

The project needs roughly one focused week of remediation to reach a 6–7 out of 10 baseline for technical review.

---

### 32. Top 3 Highest-Leverage Actions

**Action 1: Resolve the security cluster in one sprint (targets C-1 through C-5)**

Confirm and document that all credentials exposed in the historical `.env` commit have been rotated. Then fix the four remaining open security findings in priority order: Next.js upgrade (C-2, < 1 hr), SQL injection patch (C-4, ~1 hr), IDOR wallet check (C-5, ~2 hrs), mobile socket.io replacement (C-3, ~2 hrs). These are all tracked in `audits/findings/` as "READY TO FIX" with estimated durations. Completing all of them removes every Critical item except the build failure. Total estimated effort: 1 day.

**Action 2: Fix the API build or formally adopt `--transpile-only` as the official deploy strategy**

The current state — where the deploy pipeline calls `nest build` and fails, while the documented workaround is `--transpile-only` — is the single biggest credibility gap for a technical reviewer. Either: (a) resolve the 666+ TypeScript errors in the API (significant effort, multi-day), or (b) update `apps/api/package.json` build script and `deploy.yml` to use `ts-node --transpile-only` consistently, add a `typecheck` script for non-blocking TS validation, and document this as the intentional strategy. Option (b) takes 1–2 hours and eliminates the broken build signal while being honest about the state of the TypeScript migration.

**Action 3: Add a LICENSE file and a live demo link**

Create `LICENSE` at the repo root with the chosen license text (MIT or proprietary — pick one and be consistent across all `package.json` files and the README). Update the README to include a hosted demo URL or, at minimum, two screenshots of the working product. These two changes take under 30 minutes and are the first things any investor will look for before reading another line of code.

---

*End of audit. All findings are sourced directly from the repository at commit `c73241e` and local `npm audit` output run 2026-03-16.*
