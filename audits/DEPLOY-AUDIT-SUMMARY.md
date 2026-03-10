# Build/Deploy & Observability Audit Summary
**Embr Platform | 2026-03-10**

## Executive Summary

The **embr** monorepo (NestJS API + Next.js web frontend) has a **CRITICAL BLOCKER** preventing deployments: the API NestJS build fails with TypeScript compilation errors. Additionally, the CI/CD pipeline has significant gaps that allow type errors and build failures to reach production undetected.

**Deployment Status:** 🔴 **NOT READY** — Fix blocker before proceeding to staging or production.

---

## Critical Issues (Fix Immediately)

### 1. ⛔ NestJS Build Fails: MessagingService Missing Method
- **Severity:** Blocker (P0)
- **File:** `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts`
- **Error:** Method `getUnreadCountForConversation` called on lines 508 and 721 but not defined in class
- **Impact:** `npm run build:api` fails; all deployments blocked
- **Fix:** Implement missing method or remove calls (~1 day)
- **Status:** Open

---

### 2. 🟠 CI/CD Pipeline Doesn't Build API
- **Severity:** Major (P1)
- **File:** `.github/workflows/ci.yml`
- **Issue:** API is not built or tested in CI; only web typecheck + build are validated
- **Impact:** Type errors and build failures reach `main` branch undetected
- **Fix:** Add `npm --prefix apps/api run build` step to CI (~0.5 days)
- **Status:** Open

---

## Major Issues (Fix This Week)

### 3. 🔴 API Health Check Endpoint Missing
- **Severity:** Major (P1)
- **File:** `.github/workflows/deploy.yml` references `/api/health` (line 88)
- **Issue:** Endpoint not implemented in NestJS app; deployment verification times out
- **Fix:** Create HealthController with GET `/health` endpoint (~1 day)
- **Status:** Open

### 4. 🔴 No Environment Variable Validation at Startup
- **Severity:** Major (P1)
- **File:** `apps/api/src/main.ts`
- **Issue:** Only SENTRY_DSN checked; JWT_SECRET, DATABASE_URL, REDIS_URL, AWS keys not validated
- **Impact:** Missing vars cause runtime crashes hours after deployment
- **Fix:** Add Joi/Zod validation for all required vars (~1 day)
- **Status:** Open

### 5. 🔴 No React Error Boundary in Web Frontend
- **Severity:** Major (P1)
- **File:** `apps/web/src/pages/_error.tsx` (exists) + missing ErrorBoundary component
- **Issue:** Server-side error handling exists; client-side component errors leave users with blank screen
- **Fix:** Create ErrorBoundary component and wrap app in `_app.tsx` (~1 day)
- **Status:** Open

### 6. 🔴 TypeScript Strict Mode Has 666+ Pre-existing Errors
- **Severity:** Major (P1)
- **Files:** `apps/api/ts_errors.log` through `ts_errors_v7.log`
- **Issue:** API has strict mode enabled but hundreds of type violations prevent clean builds
- **Impact:** Developers use `--transpile-only` workaround (unsafe code reaches production)
- **Fix:** Multi-sprint effort: triage errors, fix critical ones, enforce budget in CI (~5 days)
- **Status:** Open

---

## Medium Issues (Fix This Sprint)

### 7. 🟠 Web App Doesn't Validate API URL at Build Time
- **Severity:** Minor (P2)
- **File:** `apps/web/next.config.js` + `src/lib/api/error.ts`
- **Issue:** NEXT_PUBLIC_API_URL falls back to localhost:3003 if not set in production
- **Fix:** Add build-time validation (~0.5 days)

### 8. 🟠 CSP Header Uses unsafe-inline (XSS Risk)
- **Severity:** Minor (P2)
- **File:** `apps/web/next.config.js` (line 33–36)
- **Issue:** script-src 'unsafe-inline' 'unsafe-eval' defeats CSP protection before launch
- **Fix:** Implement nonce-based CSP (~1 day)

### 9. 🟠 No Structured Logging (JSON)
- **Severity:** Minor (P2)
- **File:** `apps/api/src/core/redis/redis.service.ts` + others
- **Issue:** Logs are plain text; hard to aggregate in production logging systems
- **Fix:** Migrate to Winston/Pino (~3 days)

### 10. 🟠 Sentry Error Reporting Not Configured
- **Severity:** Minor (P2)
- **File:** `apps/api/src/main.ts`
- **Issue:** Unhandled production errors not reported to external service
- **Fix:** Install @sentry/node and configure (~2 days)

---

## Questions Requiring Human Decision

1. **Docker Prod Config:** Should `docker-compose.prod.yml` be version-controlled or managed on deployment server?
2. **Database Rollback:** What's the rollback procedure if a Prisma migration fails mid-deployment?
3. **Deployment Rollback:** Should failed deployments auto-rollback to previous version?

---

## Build & Deployment Configuration Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Build: API** | ❌ FAILING | NestJS build fails; 2 TS errors in MessagingService |
| **Build: Web** | ✅ SUCCESS | Next.js builds cleanly (no strict type check for web) |
| **CI: API Build** | ❌ MISSING | Not in ci.yml pipeline |
| **CI: API Test** | ❌ MISSING | No test step for API |
| **CI: Web Test** | ❌ MISSING | No test infrastructure configured |
| **Error Handling: API** | ✅ PARTIAL | Global exception filter exists; no Sentry integration |
| **Error Handling: Web** | ⚠️ PARTIAL | _error.tsx exists; no React ErrorBoundary |
| **Logging: API** | ⚠️ PARTIAL | Plain-text logs via NestJS Logger; no structured JSON |
| **Logging: Web** | ✅ BASIC | Console.error in development; no production logging |
| **Env Validation: API** | ❌ MISSING | Only SENTRY_DSN checked; others unchecked |
| **Env Validation: Web** | ❌ MISSING | NEXT_PUBLIC_API_URL not validated at build |
| **Health Check** | ❌ MISSING | /api/health endpoint referenced but not implemented |
| **Docker Setup** | ✅ GOOD | docker-compose.yml configured; prod config location unclear |
| **Database Rollback** | ❌ MISSING | No documented procedure for failed migrations |
| **Deployment Rollback** | ❌ MISSING | No auto-rollback if health check fails |

---

## Recommended Action Plan

### Phase 1: Unblock Deployment (1–2 Days)
- [ ] Fix NestJS build error (MessagingService method)
- [ ] Add API build step to CI/CD
- [ ] Implement /api/health endpoint
- [ ] Add env var validation at startup

### Phase 2: Improve Observability (3–4 Days)
- [ ] Create React Error Boundary for web
- [ ] Add structured logging (Winston/Pino)
- [ ] Configure Sentry error reporting
- [ ] Validate NEXT_PUBLIC_API_URL at build time

### Phase 3: Security & Safety (2–3 Days)
- [ ] Tighten CSP header (remove unsafe-inline, use nonces)
- [ ] Document database rollback procedure
- [ ] Document/implement deployment rollback strategy
- [ ] Clarify docker-compose.prod.yml version control

### Phase 4: Long-term (2+ Weeks)
- [ ] Fix TypeScript strict mode errors (666+ violations)
- [ ] Set up type-error budget and enforcement in CI
- [ ] Fully migrate logging to structured JSON format
- [ ] Add comprehensive error recovery tests

---

## Files Generated

- **Audit Output (JSON):** `audits/runs/2026-03-10/deploy.20260310-150000.json` (schema v1.1.0)
- **Audit Summary (Markdown):** `audits/runs/2026-03-10/deploy.20260310-150000.md`
- **This File:** `audits/DEPLOY-AUDIT-SUMMARY.md`

---

## Next Steps

1. **Read the full audit report:** `audits/runs/2026-03-10/deploy.20260310-150000.json` (machine-readable)
2. **Review findings:** `audits/runs/2026-03-10/deploy.20260310-150000.md` (human-readable)
3. **Triage issues:** Use Phase 1 action plan to unblock deployments
4. **Run full audit after fixes:** Re-run Agent F on fixed codebase to verify closure

---

*Embr Build/Deploy & Observability Audit | LYRA Audit Suite v1.1*
