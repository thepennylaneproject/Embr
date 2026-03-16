# Investor Audit Remediation Plan
**Date:** 2026-03-16  
**Source Audit:** `INVESTOR-READINESS-AUDIT-20260316.md`  
**Current Score:** 3.5 / 10  
**Target Score:** 6–7 / 10 (investor-ready baseline)  
**Estimated Total Effort:** 6–8 focused days

---

## Overview

This plan converts every finding from the 2026-03-16 investor readiness audit into tracked, actionable work items. Items are organized into four sprints by urgency. All work should be completed on dedicated feature branches, reviewed, and merged before any investor outreach.

---

## Sprint 1 — Security Cluster (Target: 1 day)
*Resolve every CRITICAL security finding. Nothing in this sprint is optional.*

### S1-1 · Confirm production secret rotation (maps to C-1, existing: sec-001)
**Finding file:** `audits/findings/sec-001.md` (manual action still open)  
**Effort:** 30–60 min  
**Owner:** Sarah  
**Status:** Manual action pending  

`docs/SECURITY.md` was written on 2026-03-10 listing all exposed credentials as "MUST rotate immediately". No confirmation of completion exists in the repo. This needs a written confirmation before investor conversations.

**Steps:**
1. Confirm each credential category below has been rotated in its respective service:
   - [ ] PostgreSQL connection string + password
   - [ ] JWT access + refresh secret keys
   - [ ] Redis auth token
   - [ ] AWS Access Key ID + Secret Access Key
   - [ ] Stripe live API keys (`sk_live_*` and `whsec_*`)
   - [ ] Mux video processing token + secret
   - [ ] Google OAuth client ID + secret
   - [ ] SMTP credentials
2. Update `docs/SECURITY.md` — replace the open action item with a confirmation line: `Rotated: YYYY-MM-DD by <name>`.
3. Commit as `security(sec-001): confirm production credential rotation YYYY-MM-DD`.

---

### S1-2 · Upgrade Next.js to patch authorization bypass CVE (maps to C-2)
**Finding file:** `audits/findings/inv-001.md` (new)  
**CVE:** GHSA-f82v-jwr5-mffw · CVSS 9.1  
**Effort:** < 1 hour  
**Branch:** `fix/inv-001-nextjs-cve`  

The current `next@14.2.5` contains a middleware authorization bypass that allows unauthenticated users to access protected routes.

**Steps:**
1. `cd apps/web && npm install next@14.2.25` (minimum patched version; use latest 14.x available).
2. Run `npm run build` in `apps/web` to confirm no breaking changes.
3. Test login flow and a protected route (`/feed`, `/wallet`) to confirm auth still gates correctly.
4. Commit as `fix(inv-001): upgrade next.js to patch GHSA-f82v-jwr5-mffw`.

---

### S1-3 · Replace unofficial react-native-socket.io-client with official package (maps to C-3)
**Finding file:** `audits/findings/inv-002.md` (new)  
**CVEs:** GHSA-qm95-pgcg-qqfq (CVSS 9.8), GHSA-h4j5-c7cj-74xg (CVSS 9.8), GHSA-72mh-269x-7mh5 (CVSS 9.4)  
**Effort:** ~2 hours  
**Branch:** `fix/inv-002-socketio-mobile`  

`apps/mobile` uses `react-native-socket.io-client` (unofficial, unmaintained) which carries three critical CVEs via its vendored `xmlhttprequest-ssl`.

**Steps:**
1. `cd apps/mobile && npm uninstall react-native-socket.io-client`.
2. `npm install socket.io-client@4` (official package, compatible with the NestJS socket.io gateway).
3. Update all import statements: `import { io } from 'socket.io-client'`.
4. Verify mobile Socket.io connection and event handling still works (manual test or emulator).
5. Run `npm audit` in `apps/mobile` to confirm CVEs are cleared.
6. Commit as `fix(inv-002): replace react-native-socket.io-client with official socket.io-client`.

---

### S1-4 · Fix SQL injection in social-graph services (maps to C-4, existing: sec-002)
**Finding file:** `audits/findings/sec-002.md`  
**Effort:** ~1 hour  
**Branch:** `fix/sec-002-sql-injection`  

`follows.service.ts` (lines 479–494) and `user-discovery.service.ts` (lines 501–517) interpolate `${userId}` and `${limit}` directly into `$queryRaw` template literals.

**Steps:**
1. Open `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts`.
2. Replace the raw query block (lines ~479–494) using one of:
   - Prisma client `findMany` (preferred — safe by default), or
   - `Prisma.sql` tagged template with bound parameters (`Prisma.sql\`WHERE id = ${userId}\``).
3. Repeat for `user-discovery.service.ts` (lines ~501–517), same pattern.
4. Restart the API and test the affected endpoints with a legitimate user ID to confirm correct results.
5. Optionally test with a SQL injection payload (`' OR '1'='1`) to confirm it is rejected/escaped.
6. Commit as `fix(sec-002): parameterize $queryRaw queries in social-graph services`.

---

### S1-5 · Add ownership check to wallet endpoints (maps to C-5, existing: sec-005)
**Finding file:** `audits/findings/sec-005.md`  
**Effort:** ~2 hours  
**Branch:** `fix/sec-005-wallet-idor`  

`wallet.controller.ts` fetches wallet data without verifying the requesting user owns the wallet, allowing any authenticated user to read another user's balance and transactions.

**Steps:**
1. Open `apps/api/src/core/monetization/controllers/wallet.controller.ts`.
2. In `getWallet()` and all related endpoints, after fetching the wallet record, verify `wallet.userId === requestingUser.id`. Throw `ForbiddenException` if mismatch.
3. Apply the same check in `wallet.service.ts` at the service layer so it is enforced regardless of which controller calls it.
4. Audit the full `monetization` controller set for any other endpoints that accept a user or wallet ID without ownership verification.
5. Test: log in as user A, attempt to fetch user B's wallet — confirm 403.
6. Commit as `fix(sec-005): add ownership verification to wallet endpoints`.

---

### S1-6 · Create LICENSE file and resolve license contradiction (maps to C-7)
**Finding file:** `audits/findings/inv-003.md` (new)  
**Effort:** < 30 min  

Three conflicting signals: `package.json` declares MIT, `README.md` footer says "All rights reserved", no `LICENSE` file exists. An investor's legal team will flag this immediately.

**Decision required:** Choose one of:
- **Option A — MIT**: Open source. `LICENSE` file contains MIT text.
- **Option B — Proprietary**: All rights reserved. Update `package.json` to `"license": "UNLICENSED"`, remove MIT references.

**Steps (assuming Option A — MIT):**
1. Create `/workspace/LICENSE` with standard MIT text (substitute year and owner name).
2. In `README.md` line 47: remove "All rights reserved — © The Penny Lane Project" footer OR replace with "MIT License — © 2026 [Owner Name]".
3. Verify `packages/music-sdk/package.json` `"license"` field matches.
4. Commit as `docs(inv-003): add LICENSE file and align license references`.

---

## Sprint 2 — Build Integrity + High-Value Security (Target: 2–3 days)

### S2-1 · Fix broken deploy pipeline (maps to C-6)
**Finding file:** `audits/findings/inv-004.md` (new)  
**Effort:** 1–2 hours (Option B) or multi-day (Option A)  
**Branch:** `fix/inv-004-deploy-pipeline`  

`.github/workflows/deploy.yml` line 25 calls `npm --prefix apps/api run build` (`nest build`) which fails due to 666+ TypeScript errors. Every push to `main` triggers a deploy that cannot complete.

**Decision required:** Choose one of:
- **Option A — Fix all TS errors**: ~multi-day effort, full type safety restored. Only recommended if there is dedicated time.
- **Option B — Adopt `--transpile-only` as the official deploy strategy** (recommended for now):

**Steps for Option B:**
1. In `apps/api/package.json`, split the build script:
   ```json
   "build": "ts-node --transpile-only -r tsconfig-paths/register src/main.ts",
   "typecheck": "tsc --noEmit"
   ```
2. Update `.github/workflows/deploy.yml` line 25: change `npm --prefix apps/api run build` to use `ts-node --transpile-only`.
3. Add a non-blocking `typecheck` step to `ci.yml` that reports TS errors without failing the build.
4. Add a comment in `deploy.yml` explaining this is the intentional strategy while TS migration is ongoing.
5. Test: trigger a dry-run deploy (or push to a test branch) and confirm the build step passes.
6. Commit as `fix(inv-004): adopt transpile-only deploy strategy, add non-blocking typecheck`.

---

### S2-2 · Fix over-exposed user data in API responses (maps to R-1, existing: sec-004)
**Finding file:** `audits/findings/sec-004.md`  
**Effort:** 2–3 hours  
**Branch:** `fix/sec-004-data-exposure`  

`sanitizeUser` in `auth.service.ts` only strips `passwordHash` and `googleId`, returning all other fields including `email`, wallet balance, and verification status to any caller.

**Steps:**
1. Create `PublicUserProfileDto` (fields: `id`, `username`, `displayName`, `avatarUrl`, `bio`, `role`, `createdAt`).
2. Create `PrivateUserProfileDto` extending public with: `email`, `isEmailVerified`, `onboardingCompleted`.
3. Update `GET /api/users/:username` to return `PublicUserProfileDto` for other users, `PrivateUserProfileDto` for self.
4. Update `sanitizeUser` to use `PrivateUserProfileDto` as the minimum for authenticated responses.
5. Test: fetch another user's profile — confirm `email` and financial fields are absent. Fetch own profile — confirm `email` is present.
6. Commit as `fix(sec-004): create role-based DTOs to prevent user data over-exposure`.

---

### S2-3 · Add missing admin guards to open endpoints (maps to R-2)
**Finding file:** `audits/findings/inv-005.md` (new)  
**Effort:** 30–60 min  
**Branch:** `fix/inv-005-admin-guards`  

Two production endpoints have `// TODO: Add admin guard` comments and are unprotected:
- `apps/api/src/core/notifications/notifications.controller.ts` line 133
- `apps/api/src/core/monetization/controllers/stripe-connect.controller.ts` line 82

**Steps:**
1. Locate the existing admin guard (likely `@Roles(UserRole.ADMIN)` or a custom `AdminGuard`).
2. Apply it to both endpoints.
3. Remove the TODO comments.
4. Test: confirm a non-admin user receives 403 on both endpoints.
5. Commit as `fix(inv-005): add admin guards to notifications and stripe-connect endpoints`.

---

### S2-4 · Remove console.log from production web code (maps to R-3)
**Finding file:** `audits/findings/inv-006.md` (new)  
**Effort:** 30 min  
**Branch:** `fix/inv-006-console-logs`  

9 `console.log` calls in production web source: `useMessaging.ts` (5), `AuthContext.tsx` (1), `DMInbox.tsx` (3), `analytics/events.ts` (1).

**Steps:**
1. In `apps/web/src/hooks/useMessaging.ts`: remove or replace all 5 `console.log` calls with a no-op or a scoped debug logger that only runs in development.
2. In `apps/web/src/contexts/AuthContext.tsx` line 78: remove the token refresh log.
3. In `apps/web/src/components/messaging/DMInbox.tsx`: remove all 3 messaging event logs.
4. In `apps/web/src/pages/api/analytics/events.ts` line 39: remove the received events log (or gate with `process.env.NODE_ENV === 'development'`).
5. Run `grep -r "console.log" apps/web/src/` to confirm all instances are cleared.
6. Commit as `fix(inv-006): remove console.log from production web source`.

---

### S2-5 · Fix npm audit critical + high vulnerabilities (maps to R-10, C-2/C-3 carry-over)
**Note:** C-2 (Next.js) and C-3 (socket.io) are the two critical CVEs with direct code fixes. After those sprints, run `npm audit` to re-triage the remaining 3 critical and ~23 high findings.

**Steps:**
1. After completing S1-2 and S1-3, run `npm audit` from the workspace root.
2. For remaining critical/high findings, run `npm audit fix --force` selectively per workspace (`apps/web`, `apps/api`, `apps/mobile`).
3. For packages that cannot be auto-upgraded, document the finding and reason in a comment in the relevant `package.json`.
4. Commit audit results: `fix(deps): resolve remaining critical and high npm audit findings`.

---

## Sprint 3 — Code Quality + Developer Experience (Target: 2–3 days)

### S3-1 · Fix web ESLint configuration (maps to R-4)
**Effort:** 1–2 hours  
**Branch:** `fix/eslint-web-config`  

`apps/web/.eslintrc.json` extends `@embr/config/eslint` which is unresolvable because `packages/config/` has no installed dependencies. `npm run lint` in `apps/web/` fails for every engineer and in CI.

**Steps:**
1. Check `packages/config/` — if the package is empty or not needed, inline the rules directly into `apps/web/.eslintrc.json` (extend `next/core-web-vitals` and `@typescript-eslint/recommended` directly).
2. Alternatively, install the missing dependencies in `packages/config/`.
3. Run `cd apps/web && npx next lint` — confirm zero config errors.
4. Commit as `fix(eslint): resolve unresolvable @embr/config/eslint extension in web app`.

---

### S3-2 · Add Prettier configuration (maps to R-5)
**Effort:** 30 min  
**Branch:** `fix/prettier-config`  

No `.prettierrc` exists anywhere. Code style is inconsistent.

**Steps:**
1. Create `/.prettierrc` at the workspace root:
   ```json
   {
     "semi": true,
     "singleQuote": true,
     "trailingComma": "all",
     "printWidth": 100,
     "tabWidth": 2
   }
   ```
2. Add `"format": "prettier --write \"**/*.{ts,tsx,js,json,md}\""` to the root `package.json` scripts.
3. Add `.prettierignore` excluding `node_modules`, `dist`, `.next`, `build`, `the_penny_lane_project/`.
4. Run `npm run format` and commit the formatting changes in a single commit so future diffs stay clean.
5. Commit as `chore: add prettier configuration and format codebase`.

---

### S3-3 · Fix bare `.then()` without `.catch()` in web pages (maps to R-7)
**Effort:** 1–2 hours  
**Branch:** `fix/async-error-handling`  

Five `useEffect` hooks in `apps/web/src/pages/groups/[id].tsx` (lines 65, 72, 78, 83, 88) and one in `mutual-aid/[id].tsx` (line 172) swallow errors silently.

**Steps:**
1. In `groups/[id].tsx`: for each of the 5 data-loading `useEffect` hooks, add `.catch((err) => setError(err.message))` or equivalent. Ensure each section (posts, members, events, alerts, polls) has a visible error state.
2. In `mutual-aid/[id].tsx` line 172: add `.catch()` to the `completeResponse` action handler.
3. In `notifications.gateway.ts` line 254: add `.catch()` to the WebSocket `.then()` chain.
4. Test: navigate to `/groups/[id]` with the API offline — confirm error states appear rather than blank sections.
5. Commit as `fix(inv): add .catch() handlers to bare .then() chains in web pages`.

---

### S3-4 · Remove or restore dead code files (maps to R-8)
**Effort:** 1 hour  
**Branch:** `fix/dead-code-cleanup`  

Three `.disabled.ts` payment service files and large commented-out blocks in the music module are dead code artifacts that signal abandonment to reviewers.

**Steps:**
1. For the three `.disabled.ts` files:
   - `marketplace-payment.service.disabled.ts`
   - `licensing-payment.service.disabled.ts`
   - `gigs-payment.service.disabled.ts`
   - Decision: if these services are planned for future work, rename to `.ts` but stub them as `// TODO: Implement <service> payment`. If not planned, delete the files.
2. For `apps/api/src/music/controllers/musicController.ts`, `routes/index.ts`, `services/musicService.ts`:
   - Remove the large commented-out blocks. If the music integration is abandoned, either delete the files or replace with a short comment explaining why the feature was parked.
3. For large commented-out blocks in `scheduled-posts.service.ts`, `trending.service.ts`, `notifications.gateway.ts`, `notifications.service.ts`, `monetization.api.ts`, `gigs.api.ts`, `monetization.types.ts`:
   - Remove commented-out code. If needed for reference, the git history preserves it.
4. Commit as `chore: remove dead code and commented-out implementation blocks`.

---

### S3-5 · Fix analytics event storage (maps to R-9)
**Effort:** 2–3 hours  
**Branch:** `fix/analytics-events`  

`apps/web/src/pages/api/analytics/events.ts` line 35 has `// TODO: Store events in database`. Events are received but immediately discarded — the analytics pipeline is non-functional.

**Decision required:** Choose one of:
- **Option A — Implement DB storage**: Write events to a `AnalyticsEvent` model in Prisma and create the schema migration.
- **Option B — Route to external service**: Forward events to Mixpanel, PostHog, or similar via `ANALYTICS_API_KEY` env var.
- **Option C — Explicitly disable until later**: Replace the TODO with a comment `// Analytics storage intentionally deferred. Events are logged in development only.` and gate the log with `NODE_ENV !== 'production'`. This is honest and removes the misleading impression that analytics works.

**Steps (Option C as minimum):**
1. In `analytics/events.ts` line 35: replace `// TODO: Store events in database` with an intentional comment and remove production `console.log`.
2. If choosing Option A or B, implement the storage/forwarding logic, add `ANALYTICS_API_KEY` (or equivalent) to `.env.example`, and document the setup.
3. Commit as `fix(analytics): [implement storage | disable and document deferral]`.

---

### S3-6 · Resolve bcrypt/bcryptjs split (maps to R-12)
**Effort:** 30 min  
**Branch:** `fix/bcrypt-consolidation`  

Root workspace uses `bcrypt` (native). `apps/api` uses `bcryptjs` (pure JS). Both are installed — redundant and potentially inconsistent.

**Steps:**
1. Audit which files import which package: `grep -r "bcrypt" apps/ packages/ --include="*.ts" -l`.
2. Choose one: `bcryptjs` (pure JS, no native dep, easier Docker builds) is recommended.
3. Remove `bcrypt` from root workspace `dependencies`. Install `bcryptjs` in the packages that need it.
4. Update all imports from `'bcrypt'` to `'bcryptjs'`.
5. Commit as `chore(deps): consolidate on bcryptjs, remove redundant bcrypt`.

---

### S3-7 · Fix package.json metadata (maps to P-4, P-3, P-7)
**Effort:** 15 min  

**Steps:**
1. Root `package.json`: set `"name": "embr-platform"`, `"description": "Creator social platform with freelance marketplace and monetization stack"`.
2. `.env.example` root: remove the duplicate `COOKIE_SECURE` entry (appears on two lines).
3. `apps/api/.env.example`: remove the duplicate `FRONTEND_URL`/`APP_URL` entry.
4. `README.md`: change "Next.js 14 (App Router)" to "Next.js 14 (Pages Router)".
5. Commit as `chore: fix package.json metadata and .env.example duplicates`.

---

## Sprint 4 — Polish + Investor Presentation (Target: 1–2 days)

### S4-1 · Add live demo link or screenshots to README (maps to P-2, finding C-29)
**Effort:** 30 min–2 hours (depending on demo env availability)  

The absence of any visible, running product is the single highest-friction gap for investor engagement. 

**Options (in order of preference):**
- **Option A**: Deploy a live staging environment (Vercel for web, Railway/Render for API) and add the URL to the README hero section.
- **Option B**: Add 3–5 screenshots of key flows (feed, profile, gig listing, wallet) directly to `docs/screenshots/` and embed them in the README.
- **Option C**: Record a 2-minute Loom/screen recording walkthrough and link it in the README.

**Steps:**
1. Choose an option and execute it.
2. Update `README.md` to add demo link/screenshots near the top, before setup instructions.
3. Commit as `docs: add demo link/screenshots to README`.

---

### S4-2 · Add CHANGELOG.md (maps to P-1)
**Effort:** 30 min  

**Steps:**
1. Create `/workspace/CHANGELOG.md` using Keep a Changelog format.
2. Populate with entries for the major work already done: security fixes (sec-001 through sec-005), build fixes, UI work.
3. Format: `## [Unreleased]`, `## [0.2.0] - 2026-03-16`, etc.
4. Commit as `docs: add CHANGELOG.md`.

---

### S4-3 · Delete stale remote branches (maps to R-11, P-10)
**Effort:** 15 min  

**Steps:**
1. List merged branches: `git branch -r --merged main | grep cursor/ | grep -v HEAD`.
2. Delete each merged branch: `git push origin --delete <branch-name>`.
3. Branches to delete: `cursor/PLP-13-authorization-header-consistency-8bf8`, `cursor/PLP-15-job-alerts-profile-aggregation-de07`, `copilot/audit-repo-hygiene`, `copilot/run-audit` (and others confirmed merged).
4. Branches to keep: any in active development.

---

### S4-4 · Set up branch protection on main (maps to P-10)
**Effort:** 5 min (GitHub UI)  

**Steps:**
1. In GitHub: Settings → Branches → Add branch protection rule for `main`.
2. Enable: "Require a pull request before merging", "Require approvals: 1", "Require status checks to pass before merging" (select the CI job).
3. No code change needed — this is a repository settings change.

---

### S4-5 · Fix packages/music-sdk repository URL (maps to P-5)
**Effort:** 5 min  

**Steps:**
1. Open `packages/music-sdk/package.json`.
2. Change `"repository": { "url": "https://github.com/embr/music-sdk" }` to either the actual repo URL or remove the field entirely.
3. Commit as `chore(music-sdk): fix package.json repository URL`.

---

### S4-6 · Configure SNYK_TOKEN in GitHub Actions (maps to P-11)
**Effort:** 10 min  

The CI security job silently passes if `SNYK_TOKEN` is absent.

**Steps:**
1. Create a free Snyk account and generate an API token.
2. Add `SNYK_TOKEN` as a GitHub Actions repository secret.
3. Confirm the next CI run shows Snyk results rather than silently skipping.

---

## Dependency Map

Some items must be sequenced:

```
S1-2 (Next.js upgrade) ──► S2-5 (re-audit npm)
S1-3 (socket.io replace) ─► S2-5

S2-1 (deploy pipeline) should be done before S4-4 (branch protection)
  to avoid locking engineers out when CI still fails.

S3-1 (ESLint fix) should be done before S3-2 (Prettier)
  so the lint + format pipeline is complete together.

S4-1 (live demo) requires working S2-1 (deploy pipeline).
```

---

## Effort Summary

| Sprint | Items | Estimated Duration |
|--------|-------|-------------------|
| Sprint 1 — Security cluster | S1-1 through S1-6 | 1 day |
| Sprint 2 — Build + high-value security | S2-1 through S2-5 | 2–3 days |
| Sprint 3 — Code quality | S3-1 through S3-7 | 2–3 days |
| Sprint 4 — Polish | S4-1 through S4-6 | 1–2 days |
| **Total** | | **~6–9 days** |

---

## Finding Cross-Reference

| Audit Finding | Sprint Item | Existing Finding File | New Finding File |
|--------------|-------------|----------------------|-----------------|
| C-1 Secrets rotation | S1-1 | `sec-001.md` | — |
| C-2 Next.js CVE | S1-2 | — | `inv-001.md` |
| C-3 socket.io CVE | S1-3 | — | `inv-002.md` |
| C-4 SQL injection | S1-4 | `sec-002.md` | — |
| C-5 IDOR wallet | S1-5 | `sec-005.md` | — |
| C-6 Deploy broken | S2-1 | `f-deploy-build-failure-nestjs-001.md` | `inv-004.md` |
| C-7 No LICENSE | S1-6 | — | `inv-003.md` |
| R-1 Data over-exposure | S2-2 | `sec-004.md` | — |
| R-2 Missing admin guards | S2-3 | — | `inv-005.md` |
| R-3 console.log | S2-4 | — | `inv-006.md` |
| R-4 ESLint broken | S3-1 | — | — |
| R-5 No Prettier | S3-2 | — | — |
| R-6 267× `any` | Deferred (post-investor) | — | — |
| R-7 Bare `.then()` | S3-3 | — | — |
| R-8 Dead code | S3-4 | — | — |
| R-9 Analytics | S3-5 | — | — |
| R-10 npm audit | S2-5 | — | — |
| R-11 Stale branches | S4-3 | — | — |
| R-12 bcrypt split | S3-6 | — | — |
| P-1 CHANGELOG | S4-2 | — | — |
| P-2 Demo link | S4-1 | — | — |
| P-3 .env duplicates | S3-7 | — | — |
| P-4 package.json name | S3-7 | — | — |
| P-5 music-sdk URL | S4-5 | — | — |
| P-6 Relevnt in monorepo | Deferred (documentation only) | — | — |
| P-7 App Router/Pages Router | S3-7 | — | — |
| P-8 audits/ cleanup | Deferred | — | — |
| P-9 .disabled.ts files | S3-4 | — | — |
| P-10 Branch protection | S4-4 | — | — |
| P-11 SNYK_TOKEN | S4-6 | — | — |

### Deferred Items (post-investor-readiness)
- **R-6 — 267× TypeScript `any`**: Significant effort. Tackle systematically by module after the investor baseline is reached.
- **P-6 — Relevnt in monorepo**: Add a README note explaining this is a sibling portfolio project. Low investor risk.
- **P-8 — audits/ directory cleanup**: Move `audits/` to `.audits/` or add a note in README that this is internal tooling. Minimal investor impact.
- **f-schema-rls-coverage-001 — Database RLS**: Strategic multi-day effort. Requires architectural decision. Out of scope for this sprint.

---

## Acceptance Criteria for Investor-Ready Baseline

The following must all be true before investor outreach:

- [ ] `npm audit` shows 0 critical vulnerabilities
- [ ] `cd apps/web && npm run build` exits 0
- [ ] Deploy pipeline (`deploy.yml`) completes without build failure
- [ ] All production secrets confirmed rotated (documented in `docs/SECURITY.md`)
- [ ] `LICENSE` file exists with unambiguous license
- [ ] `GET /api/users/:other-user` does not return email address or financial data
- [ ] `GET /api/wallet/:other-user-id` returns 403
- [ ] No `console.log` in production web bundle
- [ ] `npm run lint` in `apps/web` exits without config resolution error
- [ ] README contains at minimum one screenshot or a live demo link

---

*Plan authored: 2026-03-16. Source: `INVESTOR-READINESS-AUDIT-20260316.md`.*
