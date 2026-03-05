# Finding: f-security-f-016

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

Moderation restriction status leaks to any authenticated user

## Description

GET /api/safety/moderation/users/:userId/restriction has no @Roles() guard. Any authenticated user can check whether any other user is under a moderation restriction, leaking internal moderation state.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/safety/controllers/safety.controller.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Add @Roles('ADMIN', 'MODERATOR') to the endpoint, or restrict it to the user checking their own status by comparing userId param against the authenticated user's ID and throwing ForbiddenException for mismatches from non-admin callers.

**Affected files:** `apps/api/src/core/safety/controllers/safety.controller.ts`

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
