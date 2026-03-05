# Finding: f-security-f-023

> **Status:** open | **Severity:** nit | **Priority:** P3 | **Type:** bug | **Confidence:** inference

## Title

paymentIntentId stored in sessionStorage

## Description

sessionStorage.setItem('paymentIntentId', data.paymentIntentId) stores a Stripe Payment Intent ID in client-side sessionStorage. While sessionStorage is tab-scoped and does not persist across sessions, it is fully accessible to any JavaScript executing on the same origin.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/gigs/booking/[gigId].tsx`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Pass paymentIntentId as React component state or a URL parameter rather than writing it to sessionStorage. If persistence across navigation within the same session is required, encode it in a server-side session or signed cookie.

**Affected files:** `apps/web/src/pages/gigs/booking/[gigId].tsx`

**Effort:** small

**Risk:** 


## Tests Needed

- [ ] Add targeted verification tests/checks


## Related Findings

_(none)_


## Timeline

- 2026-03-05T19:44:51.494026Z | security-privacy-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
