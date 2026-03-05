# Finding: f-security-f-006

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Access tokens have a 7-day lifetime — stolen tokens cannot be invalidated

## Description

Access tokens are signed JWTs with expiresIn defaulting to '7d'. They are stateless and not tracked in the database, so logout, password change, and account suspension cannot invalidate them. A stolen access token is valid for 7 days with no revocation path. The refresh rotation mechanism provides no meaningful benefit when access tokens outlast typical session durations.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/auth/auth.service.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Reduce JWT_EXPIRES_IN to '15m'. Reduce cookie maxAge to 15 * 60 * 1000. The existing refresh token mechanism will silently renew the access token. If immediate revocation is required (for logout/suspension), implement a Redis-backed JWT denylist keyed by the jti claim.

**Affected files:** `apps/api/src/core/auth/auth.service.ts` `apps/api/src/core/auth/auth.controller.ts`

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
