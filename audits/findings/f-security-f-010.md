# Finding: f-security-f-010

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Tip financial amounts and sender details exposed to any authenticated user

## Description

GET /api/tips/post/:postId and GET /api/tips/user/:userId/received return full tip transaction records including amounts, sender IDs, and timestamps. getTipsByPost passes an empty string as the userId parameter. No ownership check verifies that the requesting user is a party to the transactions or an admin.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/monetization/controllers/tip.controller.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Add authorization checks: only the transaction recipient (or an admin) may view tips received. For post tips, restrict to the post author. Extract the requesting user's ID via @GetUser('id') and compare against the target userId parameter before returning data.

**Affected files:** `apps/api/src/core/monetization/controllers/tip.controller.ts`

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
