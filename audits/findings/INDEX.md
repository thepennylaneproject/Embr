# Audit Findings Index

**Last Updated:** 2026-03-16  
**Total Findings:** 15 | **Completed:** 4 | **Pending:** 11  
**Sources:** LYRA v1.1 Comprehensive Audit Suite + Investor Readiness Audit 2026-03-16

---

## Quick Navigation

### By Status

#### ✅ Completed (4)

| Finding ID | Title | Severity | Priority | Commits |
|-----------|-------|----------|----------|---------|
| **sec-001** | Production Secrets Committed to Git | Critical | P0 | 914cc12 |
| **f-log-001** | Missing MessagingService Method | Blocker | P0 | 657dcd8 |
| **f-deploy-build-failure-nestjs-001** | NestJS API Startup Failures | Blocker | P0 | 117711d |
| **sec-003** | Missing COOKIE_SECURE Configuration | High | P1 | a9e8dd8 |

#### ⏳ Pending (11)

| Finding ID | Title | Severity | Priority | Status |
|-----------|-------|----------|----------|--------|
| **inv-001** | Next.js Middleware Auth Bypass (CVE CVSS 9.1) | Critical | P0 | Ready to Fix |
| **inv-002** | Mobile Critical CVEs via unofficial socket.io package | Critical | P0 | Ready to Fix |
| **inv-003** | No LICENSE file — contradictory license signals | Critical | P0 | Requires Decision |
| **inv-004** | Deploy pipeline broken — `nest build` always fails | Critical | P0 | Ready to Fix |
| **f-schema-rls-coverage-001** | Database RLS Policies | Blocker | P0 | Requires Decision |
| **sec-002** | SQL Injection Vulnerabilities | High | P1 | Ready to Fix |
| **inv-005** | Missing admin guards on two production endpoints | High | P1 | Ready to Fix |
| **sec-004** | Over-Exposed User Data in API Responses | High | P1 | Ready to Fix |
| **sec-005** | IDOR in Wallet Endpoints | High | P1 | Ready to Fix |
| **inv-006** | 9 console.log statements in production web code | Medium | P1 | Ready to Fix |
| **f-schema-validation-amount-001** | Missing CHECK Constraints on Financial Fields | Major | P1 | Ready to Fix |

---

### By Priority & Severity

#### P0 (Critical/Blocker) — 7 Total

**Completed:**
- [sec-001](./sec-001.md) — Production Secrets Committed to Git (CRITICAL) ✅
- [f-log-001](./f-log-001.md) — Missing MessagingService Method (BLOCKER) ✅
- [f-deploy-build-failure-nestjs-001](./f-deploy-build-failure-nestjs-001.md) — NestJS API Startup Failures (BLOCKER) ✅

**Ready to Fix:**
- [inv-001](./inv-001.md) — Next.js Middleware Auth Bypass CVE CVSS 9.1 (CRITICAL) — < 1 hr
- [inv-002](./inv-002.md) — Mobile Critical CVEs via unofficial socket.io package (CRITICAL) — ~2 hrs
- [inv-004](./inv-004.md) — Deploy pipeline broken (CRITICAL) — 1–2 hrs

**Requires Decision:**
- [inv-003](./inv-003.md) — No LICENSE file (CRITICAL) — < 30 min after decision
- [f-schema-rls-coverage-001](./f-schema-rls-coverage-001.md) — Database RLS Policies (BLOCKER) — 5–7 days

#### P1 (High/Major) — 8 Total

**Completed:**
- [sec-003](./sec-003.md) — Missing COOKIE_SECURE Configuration (HIGH) ✅

**Ready to Fix:**
- [sec-002](./sec-002.md) — SQL Injection Vulnerabilities (HIGH) — ~1 hr
- [inv-005](./inv-005.md) — Missing admin guards on two production endpoints (HIGH) — 30–60 min
- [sec-004](./sec-004.md) — Over-Exposed User Data in API Responses (HIGH) — 2–3 hrs
- [sec-005](./sec-005.md) — IDOR in Wallet Endpoints (HIGH) — 1–2 hrs
- [inv-006](./inv-006.md) — 9 console.log statements in production web (MEDIUM) — 30 min
- [f-schema-validation-amount-001](./f-schema-validation-amount-001.md) — Missing CHECK Constraints (MAJOR) — 1 day

---

### By Type

#### Security (8)
- [sec-001](./sec-001.md) — ✅ Secrets exposure
- [sec-002](./sec-002.md) — ⏳ SQL injection
- [sec-003](./sec-003.md) — ✅ Cookie security
- [sec-004](./sec-004.md) — ⏳ Data leakage
- [sec-005](./sec-005.md) — ⏳ IDOR / Authorization
- [inv-001](./inv-001.md) — ⏳ CVE: Next.js auth bypass
- [inv-002](./inv-002.md) — ⏳ CVEs: socket.io-parser + xmlhttprequest-ssl
- [inv-005](./inv-005.md) — ⏳ Missing admin guards

#### Build & Deployment (3)
- [f-deploy-build-failure-nestjs-001](./f-deploy-build-failure-nestjs-001.md) — ✅ API startup failures
- [f-log-001](./f-log-001.md) — ✅ Missing method
- [inv-004](./inv-004.md) — ⏳ Deploy pipeline broken

#### Legal / Compliance (1)
- [inv-003](./inv-003.md) — ⏳ No LICENSE file

#### Code Quality (1)
- [inv-006](./inv-006.md) — ⏳ console.log in production

#### Database & Schema (2)
- [f-schema-rls-coverage-001](./f-schema-rls-coverage-001.md) — ⏳ RLS policies
- [f-schema-validation-amount-001](./f-schema-validation-amount-001.md) — ⏳ CHECK constraints

---

## Finding Details

### inv-001: Next.js Middleware Authorization Bypass
- **File:** [`inv-001.md`](./inv-001.md)
- **Status:** ⏳ READY TO FIX
- **Severity:** CRITICAL | **Priority:** P0
- **Type:** Security (CVE)
- **CVE:** GHSA-f82v-jwr5-mffw | **CVSS:** 9.1
- **Effort:** < 1 hour (`npm install next@14.2.25`)
- **Impact:** Unauthenticated users can bypass middleware-based route protection

---

### inv-002: Mobile Critical CVEs via unofficial socket.io package
- **File:** [`inv-002.md`](./inv-002.md)
- **Status:** ⏳ READY TO FIX
- **Severity:** CRITICAL | **Priority:** P0
- **CVEs:** GHSA-qm95-pgcg-qqfq (9.8), GHSA-h4j5-c7cj-74xg (9.8), GHSA-72mh-269x-7mh5 (9.4)
- **Effort:** ~2 hours
- **Impact:** RCE-class vulnerability in mobile Socket.IO client; MITM on connections

---

### inv-003: No LICENSE File
- **File:** [`inv-003.md`](./inv-003.md)
- **Status:** ⏳ REQUIRES DECISION (MIT or proprietary)
- **Severity:** CRITICAL | **Priority:** P0
- **Effort:** < 30 minutes after decision
- **Impact:** Legal ambiguity blocks investor IP due diligence

---

### inv-004: Deploy Pipeline Broken
- **File:** [`inv-004.md`](./inv-004.md)
- **Status:** ⏳ READY TO FIX
- **Severity:** CRITICAL | **Priority:** P0
- **Effort:** 1–2 hours (Option B: adopt transpile-only strategy)
- **Impact:** API has never been deployable via documented CI/CD pipeline

---

### inv-005: Missing Admin Guards
- **File:** [`inv-005.md`](./inv-005.md)
- **Status:** ⏳ READY TO FIX
- **Severity:** HIGH | **Priority:** P1
- **Effort:** 30–60 minutes
- **Impact:** Non-admin users can access admin notification management and Stripe Connect deletion

---

### inv-006: console.log in Production Web Code
- **File:** [`inv-006.md`](./inv-006.md)
- **Status:** ⏳ READY TO FIX
- **Severity:** MEDIUM | **Priority:** P1
- **Effort:** 30 minutes
- **Impact:** Internal state exposed in browser DevTools; quality signal

---

### sec-001: Production Secrets Committed to Git
- **File:** [`sec-001.md`](./sec-001.md)
- **Status:** ✅ RESOLVED (code) | ⚠️ Manual credential rotation still unconfirmed
- **Severity:** CRITICAL | **Priority:** P0
- **Commits:** 914cc12
- **What was fixed:** Pre-commit hooks, `.env.example`, `docs/SECURITY.md`

**Manual Actions Still Required:**
- [ ] Confirm all production credentials listed in `docs/SECURITY.md` have been rotated
- [ ] Update `docs/SECURITY.md` with rotation confirmation date

---

### f-log-001: Missing MessagingService Method
- **File:** [`f-log-001.md`](./f-log-001.md)
- **Status:** ✅ RESOLVED
- **Severity:** BLOCKER | **Priority:** P0
- **Commits:** 657dcd8

---

### f-deploy-build-failure-nestjs-001: NestJS API Startup Failures
- **File:** [`f-deploy-build-failure-nestjs-001.md`](./f-deploy-build-failure-nestjs-001.md)
- **Status:** ✅ RESOLVED (startup fixed)
- **Severity:** BLOCKER | **Priority:** P0
- **Commits:** 117711d
- **Note:** This finding addressed API *startup* in development. The CI/CD *deploy pipeline* failure is tracked separately as `inv-004`.

---

### sec-003: Missing COOKIE_SECURE Configuration
- **File:** [`sec-003.md`](./sec-003.md)
- **Status:** ✅ RESOLVED
- **Severity:** HIGH | **Priority:** P1
- **Commits:** a9e8dd8

---

### sec-002: SQL Injection Vulnerabilities
- **File:** [`sec-002.md`](./sec-002.md)
- **Status:** ⏳ READY TO FIX
- **Severity:** HIGH | **Priority:** P1
- **Effort:** ~1 hour
- **Affected files:**
  - `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts` (lines 466-495)
  - `apps/api/src/verticals/feeds/social-graph/services/user-discovery.service.ts` (lines 487-518)

---

### sec-004: Over-Exposed User Data
- **File:** [`sec-004.md`](./sec-004.md)
- **Status:** ⏳ READY TO FIX
- **Severity:** HIGH | **Priority:** P1
- **Effort:** 2–3 hours (create role-based DTOs)

---

### sec-005: IDOR in Wallet Endpoints
- **File:** [`sec-005.md`](./sec-005.md)
- **Status:** ⏳ READY TO FIX
- **Severity:** HIGH | **Priority:** P1
- **Effort:** 1–2 hours

---

### f-schema-rls-coverage-001: Database RLS Policies
- **File:** [`f-schema-rls-coverage-001.md`](./f-schema-rls-coverage-001.md)
- **Status:** ⏳ REQUIRES DECISION
- **Severity:** BLOCKER | **Priority:** P0
- **Effort:** 5–7 days (after decision)

---

### f-schema-validation-amount-001: Missing CHECK Constraints
- **File:** [`f-schema-validation-amount-001.md`](./f-schema-validation-amount-001.md)
- **Status:** ⏳ READY TO FIX
- **Severity:** MAJOR | **Priority:** P1
- **Effort:** 1 day

---

## Metrics & Progress

### Completion Summary
```
Total Findings:          15
Completed:               4 (27%)
Pending (Ready):         9 (60%)
Pending (Decision):      2 (13%)

Time Invested:          ~6 hours (prior sessions)
Remaining Estimate:
  • Quick wins (<2 hrs):   inv-001, inv-002, inv-003, inv-004, inv-005, inv-006, sec-002, sec-005
  • Medium effort (2-3h):  sec-004
  • Database (1 day):      f-schema-validation-amount
  • Strategic (5+ days):   f-schema-rls-coverage
```

### By Type
```
Security Findings:       8 (3 resolved, 5 pending)
Build/Deploy Findings:   3 (2 resolved, 1 pending)
Legal/Compliance:        1 (0 resolved, 1 pending)
Code Quality:            1 (0 resolved, 1 pending)
Database Findings:       2 (0 resolved, 2 pending)
```

### Investor-Readiness Blocker Summary
```
CRITICAL blockers (must fix before investor review): 4 pending
  - inv-001 (Next.js CVE)
  - inv-002 (mobile CVEs)
  - inv-003 (no LICENSE)
  - inv-004 (deploy pipeline broken)
  + sec-001 manual action: confirm credential rotation

HIGH security (fix to signal engineering maturity): 5 pending
  - sec-002 (SQL injection)
  - inv-005 (missing admin guards)
  - sec-004 (data over-exposure)
  - sec-005 (IDOR wallet)
  - inv-006 (console.log)
```

---

## Sprint Plan (from REMEDIATION-PLAN-20260316.md)

| Sprint | Focus | Items | Est. Duration |
|--------|-------|-------|--------------|
| Sprint 1 | Security cluster | S1-1 through S1-6 | 1 day |
| Sprint 2 | Build + high-value security | S2-1 through S2-5 | 2–3 days |
| Sprint 3 | Code quality | S3-1 through S3-7 | 2–3 days |
| Sprint 4 | Polish + investor presentation | S4-1 through S4-6 | 1–2 days |

Full plan: [`audits/runs/2026-03-16/REMEDIATION-PLAN-20260316.md`](../runs/2026-03-16/REMEDIATION-PLAN-20260316.md)

---

## How to Use This Index

1. **Start here:** Check the "Investor-Readiness Blocker Summary" above for the minimum viable fix list.
2. **View a finding:** Click any finding ID to read full details, reproduction steps, and fix instructions.
3. **Filter by status:** "Pending (Ready)" items can be picked up immediately.
4. **Plan sprints:** Use the effort estimates in the sprint plan table.
5. **Track commits:** Each resolved finding links to its resolution commit.

---

## Related Documentation

- **Remediation Plan:** [`audits/runs/2026-03-16/REMEDIATION-PLAN-20260316.md`](../runs/2026-03-16/REMEDIATION-PLAN-20260316.md)
- **Investor Audit:** [`audits/runs/2026-03-16/INVESTOR-READINESS-AUDIT-20260316.md`](../runs/2026-03-16/INVESTOR-READINESS-AUDIT-20260316.md)
- **Security Procedures:** [`docs/SECURITY.md`](../../docs/SECURITY.md)
- **Audit Suite:** [`LYRA-AUDIT-SUITE.md`](../LYRA-AUDIT-SUITE.md)
