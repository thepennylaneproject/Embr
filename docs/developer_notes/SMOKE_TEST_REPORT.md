# Embr Smoke Test Report (Closeout Rerun)
**Date:** 2026-03-04  
**Web:** http://localhost:3004  
**API:** http://localhost:3003/api  
**Accounts:** `creator@embr.app`, `user@embr.app` (password `test1234`)

---

## Executive Verdict

**Launch recommendation: READY WITH ONE MEDIUM CAVEAT**

All previously identified launch-blocking reliability issues from this remediation cycle now pass in rerun testing.  
Remaining caveat is manual-only visual confirmation of draft restore messages and native leave-page dialogs due unavailable browser automation tooling in this environment.

---

## Rerun Results (5 Core Journeys)

### 1) Auth -> feed -> first post
- Login with cookie session: **PASS**
- Feed request with/without auth: **PASS** (public feed by design)
- Post creation (`POST /api/posts`): **PASS**

Evidence:
- Post created successfully with id `a2c0e8cf-8a5f-44f9-b246-0736ce522f8b`.
- Prior 500 regression resolved by guarded profile stats updates in `posts.service`.

### 2) Event creation
- Create event with required fields (`startAt`, `endAt`): **PASS**
- API returned valid draft event payload: **PASS**

Evidence:
- Event created with id `3c36fdda-0d17-44f4-bc7d-ae7da4184f89`.

### 3) Groups discovery + join boundary
- Group list retrieval: **PASS**
- Join action behavior: **PASS** (idempotent conflict once already joined)

Evidence:
- Join attempt returned `409 Already a member`, which is correct for repeated join.

### 4) Marketplace listing + checkout integrity
- Listing create/publish: **PASS**
- Checkout endpoint (`/api/marketplace/orders/checkout`): **PASS**
- Idempotency replay returns same order and `idempotentReplay: true`: **PASS**

Evidence:
- First checkout created order `7f1559ca-1812-4657-a9f4-d5e83010e578`.
- Replay returned same order id; no duplicate order created.

### 5) Draft resilience across creation flows
- Code-path checks for save/restore + beforeunload guard: **PASS**
- Live interactive browser confirmation: **UNVERIFIED IN THIS ENV**

Evidence:
- Implementations present in:
  - `PostCreator.tsx`
  - `EventForm.tsx`
  - `CreateGroupForm.tsx`
  - `CreateListingForm.tsx`
- Browser-use subagent reported tooling unavailable for click-level confirmation.

---

## Launch Gate Status

- **Checkout integrity:** PASS
- **Auth consistency (transport):** PASS
  - No localStorage token auth pattern found in web API code paths.
- **Draft restore:** SOFT PASS (implementation complete; visual/manual confirmation pending)
- **Permission clarity:** PASS for tested paths
- **Error recovery:** PASS (post creation no longer hard fails)
- **Demo-safe behavior:** PASS (`NEXT_PUBLIC_DEMO_SAFE_MODE` path present in checkout UI)

---

## KPI / Telemetry Gate Check

From `LAUNCH_RELIABILITY_KPIS.md`:
- Event instrumentation points verified in code:
  - `auth_401_retry_started|succeeded|failed`
  - `checkout_confirmed|checkout_failed`
  - `draft_restored`
  - `post_create_failed`
- Static gate checks passed:
  - Checkout success path emits `checkout_confirmed`.
  - No simulated checkout success path found.
  - Draft restore instrumentation exists on post flow.

Note:
- Numeric threshold validation (e.g., 95%/99%) requires runtime event aggregation from real/manual sessions.

---

## Open Items (Non-blocking for this remediation closeout)

1. Manual visual confirmation sweep for draft restore and leave-warning UX on:
   - `/create`
   - `/events/create`
   - `/groups/create`
   - `/marketplace/sell`
2. Optional policy review: keep `GET /api/posts/feed` public (`@Public`) or tighten to authenticated-only feed depending on product intent.

---

## Closeout Criteria Mapping

- `POST /api/posts` succeeds for seeded users: **MET**
- Draft restore + unsaved-change protection manually verified on all 4 forms: **PARTIALLY MET** (code verified, manual visual pending)
- 5-journey smoke report with no Critical/High launch blockers: **MET**
- Checkout/auth consistency gates remain green after rerun: **MET**
- Final evidence report archived in `docs/developer_notes/`: **MET**

