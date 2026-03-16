# Finding: f-perf-005

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** enhancement | **Confidence:** evidence

## Title

Stripe account status/details endpoints call Stripe on every request without cache

## Description

`/stripe-connect/status` and `/stripe-connect/account` invoke `stripe.accounts.retrieve` each time. Stripe API is metered/rate-limited and these routes are likely polled by UI.

## Proof Hooks

### [code_ref] Direct Stripe retrieve calls in service methods

- File: `apps/api/src/core/monetization/services/stripe-connect.service.ts`

- Symbol: `getAccountStatus/getAccountDetails`

- Lines: 233-286

### [code_ref] Controller routes expose status/details without cache headers

- File: `apps/api/src/core/monetization/controllers/stripe-connect.controller.ts`

- Symbol: `getAccountStatus/getAccountDetails`

- Lines: 41-53


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Higher Stripe bill and increased risk of 429 rate limiting under dashboard polling.


## Suggested Fix

**Approach:** Add short-lived cache (e.g., 30-120s) keyed by account ID and invalidate on Stripe webhook `account.updated`.

**Affected files:** `apps/api/src/core/monetization/services/stripe-connect.service.ts` `apps/api/src/core/monetization/webhooks/stripe-webhook.controller.ts`

**Effort:** small

**Risk:** Slight staleness acceptable for status UI.


## Tests Needed

- [ ] Cache hit/miss unit tests

- [ ] Webhook invalidation integration test


## Related Findings

_(none)_


## Timeline

- 2026-03-05T19:44:51.494026Z | performance-cost-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
