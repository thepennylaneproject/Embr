# Audit Run: deploy-20260310-150000

**Date:** 2026-03-10T15:00:00Z  
**Branch:** main  
**Agent:** build-deploy-auditor (deploy) | kind: agent_output  
**Platform:** LYRA v1.1  
**Coverage complete:** true

## Preflight Artifacts
- Tests: not captured
- Lint: not captured  
- Build: captured (shows NestJS build failure)

## Summary

| Metric | Count |
|--------|-------|
| Blockers | 1 |
| Major | 5 |
| Minor | 6 |
| Bugs | 2 |
| Enhancements | 4 |
| Debt | 2 |
| Questions | 2 |
| Total Findings | 12 |

**Deployment Readiness:** ⛔ NOT READY — blocking build failure must be fixed before any deployment.

---

## Findings

### ⛔ Blocker f-deploy-build-failure-nestjs-001: NestJS API build fails with TypeScript compilation errors

**Type:** bug | **Confidence:** evidence | **Priority:** P0  
**Category:** build-config

The `npm run build:api` command (which invokes `nest build`) fails with 2 TypeScript errors in `src/verticals/messaging/messaging/services/messaging.service.ts`. The method `getUnreadCountForConversation` is called on lines 508 and 721 but is not defined in the MessagingService class. This blocks all deployments and prevents local development builds.

**Proof:** error_text from `audits/artifacts/_run_/build.txt`:
```
TS2339 Property 'getUnreadCountForConversation' does not exist on type 'MessagingService'.
```

**Fix:** Implement the missing `getUnreadCountForConversation` method or remove the calls. Run `npm run build:api` to confirm fix.

**Effort:** small (1 day)

---

### 🔴 Major f-deploy-ci-build-api-missing-001: CI/CD pipeline does not build or test the API

**Type:** bug | **Confidence:** evidence | **Priority:** P1  
**Category:** ci-gap

The CI workflow (`.github/workflows/ci.yml`) validates the Prisma schema and builds the web app, but does NOT build the API. This means TypeScript errors and build failures in `apps/api/` are not caught until deployment. The current NestJS build failure would not be detected without manual testing.

**Proof:** code_ref from `.github/workflows/ci.yml` (lines 37–68): Steps include checkout, setup node, install deps, generate prisma, run migrations, validate API prisma, typecheck web, build web. No "Build API" step.

**Fix:** Add `npm --prefix apps/api run build` to CI after the "Validate API Prisma schema" step.

**Effort:** trivial (0.5 days)

---

### 🔴 Major f-deploy-typescript-strict-api-001: API TypeScript strict mode enabled but hundreds of pre-existing type errors

**Type:** debt | **Confidence:** evidence | **Priority:** P1  
**Category:** build-config

The API has `'strict': true` in tsconfig, but files `ts_errors.log` through `ts_errors_v7.log` exist in `apps/api/`, indicating 666+ known type errors. Developers are forced to either fix all type errors or use `nest build --transpile-only` (a workaround that allows type-unsafe code to production).

**Proof:** artifact_ref to `apps/api/ts_errors.log` (pre-existing error logs); AGENTS.md mentions "666+ type errors in the API."

**Fix:** Medium-term plan: categorize errors by severity, fix critical ones (null-ref, type coercion, auth logic) this cycle, defer cosmetic errors. Set a type-error budget and enforce in CI.

**Effort:** large (5 days)

---

### 🔴 Major f-deploy-error-boundary-web-001: Web frontend has global _error page but no React Error Boundary

**Type:** enhancement | **Confidence:** evidence | **Priority:** P1  
**Category:** missing-error-boundary

The Next.js `_error.tsx` page handles server-side errors, but there is no React Error Boundary component wrapping the application tree. If a React component throws an error during render, the user sees a blank screen or confusing state with no recovery path.

**Proof:** code_ref to `apps/web/src/pages/_error.tsx` shows _error page exists. No error boundary component found in codebase.

**Fix:** Create an ErrorBoundary component (using react-error-boundary library or custom), wrap the main app in `_app.tsx`, and display a fallback UI.

**Effort:** small (1 day)

---

### 🔴 Major f-deploy-health-check-api-001: API health check endpoint referenced but may not be implemented

**Type:** enhancement | **Confidence:** evidence | **Priority:** P1  
**Category:** deploy-risk

The `deploy.yml` workflow checks API health by querying `/api/health` (line 88), but the NestJS app code does not show this endpoint implemented. If missing, deployment verification times out and fails.

**Proof:** code_ref from `.github/workflows/deploy.yml` (lines 86–100): Deployment queries `/api/health`. No implementation of this endpoint found in NestJS app.

**Fix:** Create a HealthController with GET `/health` endpoint that verifies database and Redis connectivity. Return 200 if all OK, 503 otherwise.

**Effort:** small (1 day)

---

### 🔴 Major f-deploy-env-validation-startup-001: Environment variables not validated at startup

**Type:** enhancement | **Confidence:** inference | **Priority:** P1  
**Category:** env-management

The API main.ts only warns if SENTRY_DSN is missing but does not validate required variables like JWT_SECRET, DATABASE_URL, REDIS_URL, AWS credentials. Missing vars could cause runtime crashes hours after boot, when the app first tries to use a missing credential.

**Proof:** code_ref to `apps/api/src/main.ts` (lines 75–80): Only SENTRY_DSN and ALLOWED_ORIGINS checked.

**Fix:** Create an env validation schema using Joi or Zod. Validate all required variables at startup and fail immediately if any are missing.

**Effort:** small (1 day)

---

### 🟠 Minor f-deploy-web-env-validation-001: Next.js web app does not validate NEXT_PUBLIC_API_URL at build time

**Type:** enhancement | **Confidence:** inference | **Priority:** P2  
**Category:** env-management

The web app references NEXT_PUBLIC_API_URL but does not validate it at build time. If missing, the app falls back to `http://localhost:3003/api`, which may be wrong in staging/production, causing silent API failures.

**Proof:** code_ref to `apps/web/src/lib/api/error.ts` (line 1): Falls back to localhost:3003 if NEXT_PUBLIC_API_URL not defined.

**Fix:** Add build-time validation in `next.config.js` to fail if NEXT_PUBLIC_API_URL is not set in production.

**Effort:** trivial (0.5 days)

---

### 🟠 Minor f-deploy-logging-structured-001: API uses plain-text logging instead of structured JSON

**Type:** debt | **Confidence:** inference | **Priority:** P2  
**Category:** logging-gap

The API logs errors using NestJS built-in Logger (console-based), which outputs plain text. In production, structured JSON logging (Winston, Pino) makes it easier to parse and aggregate logs in centralized logging systems.

**Proof:** code_ref to `apps/api/src/core/redis/redis.service.ts`: Uses `private readonly logger = new Logger(RedisService.name)`, outputs plain text.

**Fix:** Install Winston or Pino, create a logging module, and gradually migrate services to use structured logging.

**Effort:** medium (3 days)

---

### 🟠 Minor f-deploy-sentry-not-configured-001: Sentry error reporting not configured

**Type:** enhancement | **Confidence:** inference | **Priority:** P2  
**Category:** logging-gap

The main.ts warns if SENTRY_DSN is not set, but there is no Sentry SDK integration. Production errors are not sent to an external service, leaving you blind to post-deployment issues until a user reports them.

**Proof:** code_ref to `apps/api/src/main.ts` (lines 75–80): Logs warning but no active Sentry integration.

**Fix:** Install @sentry/node, initialize in main.ts before app bootstrap, create a Sentry exception filter, get a SENTRY_DSN from sentry.io, and set it in production env.

**Effort:** small (2 days)

---

### 🟠 Minor f-deploy-docker-prod-config-missing-001: Production Docker Compose config not found in repo

**Type:** question | **Confidence:** speculation | **Priority:** P2  
**Category:** deploy-risk

The deploy.yml references `docker/docker-compose.prod.yml`, but only `docker-compose.yml` exists. The prod config may be managed separately on the deployment server, or it may be missing (causing deployments to fail).

**Proof:** code_ref from `.github/workflows/deploy.yml` (line 79): References `docker/docker-compose.prod.yml` which does not exist in repo.

**Fix:** **HUMAN DECISION NEEDED:** Clarify whether prod config should be version-controlled. If yes, commit it now (ensure no secrets). If managed on server, document clearly in README.

**Effort:** trivial (0.5 days)

---

### 🟠 Minor f-deploy-csp-unsafe-inline-001: Content Security Policy uses unsafe-inline for scripts

**Type:** debt | **Confidence:** evidence | **Priority:** P2  
**Category:** build-config

The `next.config.js` defines CSP with `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, which defeats CSP's purpose of preventing XSS attacks. Should use nonces or strict script-src.

**Proof:** code_ref from `apps/web/next.config.js` (lines 33–36): CSP allows unsafe-inline and unsafe-eval scripts.

**Fix:** Remove `'unsafe-inline'` and `'unsafe-eval'`. Implement nonce-based CSP: generate random nonce per request and include in script tags.

**Effort:** small (1 day)

---

### 🟠 Minor f-deploy-db-migration-rollback-001: Database migration rollback plan not documented

**Type:** question | **Confidence:** speculation | **Priority:** P2  
**Category:** deploy-risk

The deploy workflow runs `npm run db:migrate:deploy`, but if a migration fails mid-deployment, the database could be left in an inconsistent state. Prisma migrations are forward-only; there's no built-in rollback.

**Proof:** command: `npm run db:migrate:deploy` (used in CI/CD with no rollback logic).

**Fix:** **HUMAN DECISION NEEDED:** Document migration rollback procedure (restore from backup, manually revert schema). Consider automated backups before migrations.

**Effort:** small (1 day)

---

### 🟠 Minor f-deploy-no-rollback-strategy-001: No automated rollback if deployment health check fails

**Type:** question | **Confidence:** speculation | **Priority:** P2  
**Category:** deploy-risk

The deploy workflow waits 120 seconds for API health check. If it times out, the job fails but the broken container remains running. No automatic rollback to the previous version.

**Proof:** code_ref from `.github/workflows/deploy.yml` (lines 82–100): Health check failure causes job failure, but no rollback step follows.

**Fix:** **HUMAN DECISION NEEDED:** Add rollback logic (e.g., restart previous container if using versioning). For MVP, acceptable; before production scale, implement automated rollback.

**Effort:** medium (2 days)

---

## Questions Requiring Human Decision

1. **f-deploy-docker-prod-config-missing-001:** Should `docker-compose.prod.yml` be version-controlled or managed on the deployment server?
2. **f-deploy-db-migration-rollback-001:** What is the database rollback strategy for failed migrations?
3. **f-deploy-no-rollback-strategy-001:** Should deployments auto-rollback if health check fails?

---

## Next Actions

1. **[P0] Fix MessagingService build error** (re: f-deploy-build-failure-nestjs-001) — BLOCKS ALL DEPLOYMENTS. Estimated: 1 day.
2. **[P1] Add API build step to CI/CD** (re: f-deploy-ci-build-api-missing-001) — Prevents future type errors from reaching merge. Estimated: 0.5 days.
3. **[P1] Implement API health check endpoint** (re: f-deploy-health-check-api-001) — Required for deployment verification. Estimated: 1 day.
4. **[P1] Add environment variable validation at startup** (re: f-deploy-env-validation-startup-001) — Catches misconfigurations before runtime. Estimated: 1 day.
5. **[P1] Create React Error Boundary for web** (re: f-deploy-error-boundary-web-001) — Prevents user-facing blank screens on component errors. Estimated: 1 day.
6. **[P2] Clarify docker-compose.prod.yml location** (re: f-deploy-docker-prod-config-missing-001) — Unblock deployment clarity. Estimated: 0.5 days.
7. **[P2] Validate NEXT_PUBLIC_API_URL in build** (re: f-deploy-web-env-validation-001) — Prevent silent API failures in production. Estimated: 0.5 days.

---

## Coverage Report

**Examined:** 15 files  
**Skipped:** 0  
**Complete:** true

### Files Examined
- Root: `package.json`, `tsconfig.base.json`, `.env.example`
- API: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/Dockerfile`, `apps/api/src/main.ts`
- Web: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.js`, `apps/web/src/pages/_error.tsx`
- CI/CD: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- Docker: `docker/docker-compose.yml`
- Artifacts: `audits/artifacts/_run_/build.txt`

---

## Deployment Readiness Checklist

- [x] Infrastructure configured (Docker, databases)
- [x] Environment variables documented (.env.example)
- [x] CI/CD workflows exist
- [x] Error handling partially in place (web _error page, API global filter)
- [ ] **Build succeeds** ← BLOCKER: NestJS build fails
- [ ] **CI/CD tests API** ← GAP: API not built in CI
- [ ] **Health check implemented** ← GAP: endpoint not found
- [ ] **Env vars validated at startup** ← GAP: only SENTRY_DSN checked
- [ ] **Error boundaries in place** ← GAP: no React error boundary in web
- [ ] **Structured logging / external error reporting** ← GAP: no Sentry, no JSON logs
- [ ] **Database rollback strategy documented** ← GAP: none documented
- [ ] **Deployment rollback strategy** ← GAP: no auto-rollback on health failure

---

## Severity Summary

### 🔴 Red Zone (Blocks Deployment)
- **1 Blocker:** Fix NestJS build error immediately

### 🟠 Orange Zone (Must Fix This Week)
- **5 Major:** CI/CD gap, health check missing, env validation missing, error boundary missing, TypeScript debt

### 🟡 Yellow Zone (Nice to Have, Plan for Later)
- **6 Minor:** structured logging, Sentry, CSP hardening, rollback procedures, docker config clarity

---

*LYRA Deploy Auditor v1.1 — Build, deploy, and observability audit for Embr platform*
