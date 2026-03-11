# LYRA v1.1 Synthesis Report (Updated with Data/Schema Audit)
**Embr Audit Suite | 2026-03-10**

## Executive Summary

This updated report synthesizes findings from **6 specialized audit agents** run against the Embr monorepo (NestJS API + Next.js web frontend). The audit identified **78 total findings** across infrastructure, security, database schema, performance, and UX domains.

### Critical Findings

**3 BLOCKERS** preventing deployment/security:
- Messaging service missing required method (**f-log-001**)
- NestJS build fails due to TypeScript errors (**f-deploy-build-failure-nestjs-001**)
- Database lacks Row-Level Security policies (**f-schema-rls-coverage-001**)

**1 CRITICAL** security issue:
- Production secrets committed to git (**sec-001**) — immediate remediation required

**4 HIGH** severity issues requiring urgent fixes

---

## Findings Breakdown

### By Severity

| Severity | Count | Status |
|----------|-------|--------|
| **Blocker** | 3 | Blocks deployment/security |
| **Critical** | 1 | Data/security compromise risk |
| **High** | 4 | Significant functional/security issues |
| **Major** | 38 | Should fix before release |
| **Minor** | 32 | Nice-to-fix, low impact |
| **TOTAL** | **78** | |

### By Priority

| Priority | Count |
|----------|-------|
| P0 (Blocker/Critical) | 8 |
| P1 (High/Major) | 32 |
| P2 (Major) | 28 |
| P3+ (Minor) | 10 |

### By Agent

| Agent | Suite | Findings | Coverage |
|-------|-------|----------|----------|
| schema-auditor | data | 7 | Complete ✓ |
| build-deploy-auditor | deploy | 9 | Complete ✓ |
| runtime-bug-hunter | logic | 12 | Partial (77+ services) |
| security-privacy-auditor | security | 23 | Complete ✓ |
| performance-cost-auditor | performance | 17 | Partial (no profiling) |
| ux-flow-auditor | ux | 10 | Complete ✓ |

---

## Top Priority Fixes (P0/P1)

### MUST FIX IMMEDIATELY

**1. [f-log-001] Missing method: getUnreadCountForConversation in MessagingService**
- **Severity:** Blocker | **Priority:** P0 | **Agent:** runtime-bug-hunter
- **File:** `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts` (lines 508, 721)
- **Impact:** Blocks entire API build
- **Effort:** ~5 minutes
- **Fix:** Implement missing `getUnreadCountForConversation(conversationId, userId)` method with async signature returning Promise<number>

**2. [f-schema-rls-coverage-001] Database uses PostgreSQL but no RLS (Row-Level Security) policies defined**
- **Severity:** Blocker | **Priority:** P0 | **Agent:** schema-auditor
- **Database:** PostgreSQL 16
- **Impact:** All data access control relies on application code; no database-layer enforcement
- **Risk:** Complete data exposure if application middleware bypassed
- **Effort:** ~5 days
- **Fix:**
  1. Clarify if RLS is intentional or out of scope
  2. If multi-tenant isolation required: design RLS policies for User, Wallet, Transaction, Message tables
  3. Create migration with RLS ON and attach policies
  4. Test RLS bypass attempts

**3. [f-deploy-build-failure-nestjs-001] NestJS API build fails with TypeScript compilation errors**
- **Severity:** Blocker | **Priority:** P0 | **Agent:** build-deploy-auditor
- **File:** `apps/api/package.json` (build script)
- **Impact:** Prevents `npm run build:api` from completing
- **Effort:** ~1 day (after fixing f-log-001)
- **Fix:** Run `npm run build:api` to surface all type errors; fix or add `--transpile-only` flag as temporary measure

**4. [sec-001] Production secrets committed to git in .env file**
- **Severity:** Critical | **Priority:** P0 | **Agent:** security-privacy-auditor
- **Files:** `.env` (root)
- **Attack Vector:** Repository access → complete platform compromise (DB, Redis, AWS S3, Stripe, email)
- **Effort:** ~2 hours
- **Fix:**
  1. Rotate all secrets immediately
  2. Use git-filter-repo to remove .env from history: `git filter-repo --path .env`
  3. Move secrets to AWS Secrets Manager or HashiCorp Vault
  4. Enable pre-commit hooks to prevent re-commitment

**5. [sec-002] SQL Injection in $queryRaw without parameterization**
- **Severity:** High | **Priority:** P1 | **Agent:** security-privacy-auditor
- **Files:**
  - `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts` (line 466-495)
  - `apps/api/src/verticals/feeds/social-graph/services/user-discovery.service.ts` (line 487-518)
- **Attack Vector:** Authenticated attacker → data exfiltration of all users/passwords
- **Effort:** ~1 hour
- **Fix:** Replace `${userId}` interpolation with `Prisma.sql` tagged template or rewrite using Prisma client queries

**6. [f-schema-validation-amount-001] Monetary amount fields lack CHECK constraints**
- **Severity:** Major | **Priority:** P1 | **Agent:** schema-auditor
- **Files:** `apps/api/prisma/schema.prisma`
- **Affected Fields:** Wallet.balance, Transaction.amount, Tip.amount, Payout.amount
- **Risk:** Application bug or raw SQL could insert negative amounts; accounting errors
- **Effort:** ~1 day
- **Fix:** Add CHECK constraints in migration: `ALTER TABLE "Wallet" ADD CONSTRAINT wallet_balance_check CHECK (balance >= 0)`

---

## Schema-Layer Issues (New)

### Data Integrity

**[f-schema-nullable-walletid-001]** Backfill migration for walletId suggests prior constraint violations
- **Status:** Minor risk (backfill completed)
- **Action:** Verify backfill succeeded: `SELECT COUNT(*) FROM "Transaction" WHERE "walletId" IS NULL`

**[f-schema-orphaned-refs-transaction-user-001]** Transaction.userId is optional, risking orphaned records
- **Status:** Requires audit
- **Action:** Query: `SELECT COUNT(*) FROM "Transaction" WHERE "userId" IS NULL`; decide if intentional

**[f-schema-nullable-refs-001]** Multiple tables allow nullable foreign keys with SetNull cascade
- **Affected Models:** Post, Report, ModerationAction, Appeal, Event
- **Risk:** Query inconsistencies if code assumes parent always exists
- **Action:** Document intended behavior; audit query paths

### Type Safety

**[f-schema-monetary-cents-001]** Track.price and ArtistStat.revenue migrated from float to cents
- **Status:** Migration includes safety checks (no data corruption detected)
- **Action:** Spot-check ranges; add application validation for cents bounds

**[f-schema-wallet-unique-index-001]** Redundant index on Wallet.userId (already has @unique)
- **Status:** Minor code quality issue
- **Action:** Remove redundant `@@index([userId])` from schema

---

## Recommended Fix Sequence

### Phase 1: Unblock Deployment (2-3 hours)
1. Implement getUnreadCountForConversation method
2. Fix remaining TypeScript errors via `npm run build:api`
3. Rotate all secrets and remove .env from git history

### Phase 2: Security Hardening (3-4 hours)
1. Fix SQL injection vulnerabilities in follows/user-discovery services
2. Fix COOKIE_SECURE and other auth configuration
3. Add CHECK constraints on monetary amounts
4. Audit and fix IDOR and data leakage issues

### Phase 3: Database Layer (5+ days)
1. Design and implement RLS policies (if required)
2. Audit orphaned FK references and document intentional patterns
3. Add database-level constraint enforcement (CHECK constraints)

### Phase 4: Stability & Performance (2-3 days)
1. Implement soft-delete for conversations
2. Add missing database indexes
3. Fix race conditions in checkout flow

### Phase 5: UX Polish (1-2 days)
1. Standardize auth copy and terminology
2. Add back navigation to auth pages
3. Fix error state handling and loading states

---

## Coverage & Re-Audit Plan

### Complete Coverage (5 agents)
- ✓ build-deploy-auditor (CI/CD, build, deployments)
- ✓ schema-auditor (database schema, migrations, constraints)
- ✓ security-privacy-auditor (auth, data leakage, injections)
- ✓ ux-flow-auditor (UX flows, accessibility, copy)

### Partial Coverage (2 agents)
- runtime-bug-hunter (logic): 25/77+ services examined
  - **Recommendation:** Full vertical service audit
- performance-cost-auditor (perf): Inference-based (no profiling data)
  - **Recommendation:** Add database EXPLAIN ANALYZE, bundle analysis, runtime profiling

---

## Next Steps

1. **Immediate (Today):**
   - [ ] Implement getUnreadCountForConversation method (f-log-001)
   - [ ] Rotate production secrets and remove .env from git
   - [ ] Clarify RLS requirements (f-schema-rls-coverage-001)

2. **This Sprint (1-2 days):**
   - [ ] Fix build errors and TypeScript failures
   - [ ] Fix all P0/P1 security issues
   - [ ] Add CI/CD validation for API build
   - [ ] Add CHECK constraints on monetary amounts

3. **Next Sprint (1-2 weeks):**
   - [ ] Implement RLS policies if required
   - [ ] Implement soft-delete pattern for conversations
   - [ ] Add missing database indexes
   - [ ] Audit and fix orphaned FK references

4. **Backlog:**
   - [ ] Standardize UX flows and copy
   - [ ] Add test infrastructure
   - [ ] Performance profiling and optimization

---

## Artifacts

- **Synthesizer Output (v2):** `audits/runs/2026-03-10/synthesizer-v2-20260310-011114.json`
- **Open Findings:** `audits/open_findings.json` (78 findings)
- **Run Index:** `audits/index.json`
- **This Report:** `audits/runs/2026-03-10/SYNTHESIS-REPORT-20260310-UPDATED.md`

**Synthesis Run:** 2026-03-10
**Agents Contributing:** build-deploy-auditor, runtime-bug-hunter, schema-auditor, security-privacy-auditor, performance-cost-auditor, ux-flow-auditor
**Total Findings:** 78 (3 Blockers, 1 Critical, 4 High, 38 Major, 32 Minor)
