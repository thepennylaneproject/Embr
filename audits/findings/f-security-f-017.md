# Finding: f-security-f-017

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

Any authenticated user can read any moderation appeal by ID

## Description

GET /api/safety/appeals/:id has no ownership or role check. Any authenticated user with a valid appeal UUID can read the full appeal contents including the appealed user's statement and the moderation decision.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/safety/controllers/safety.controller.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** In getAppealById(), verify that the requesting user is either the appeal owner (appeal.userId === req.user.id) or a moderator/admin. Throw ForbiddenException otherwise.

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
