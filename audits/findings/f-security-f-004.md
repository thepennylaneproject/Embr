# Finding: f-security-f-004

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Suspended users can obtain valid JWT tokens via password and Google OAuth login

## Description

The login() method checks user.deletedAt but does not check a suspended or banned status field. The googleLogin() method performs no deletion or suspension check at all. A suspended user can authenticate via either path and receive fully valid tokens (access: 7 days, refresh: 30 days).

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/auth/auth.service.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Add a suspension check in both login() and googleLogin(): if (user.isSuspended || (user.suspendedUntil && user.suspendedUntil > new Date())) throw new UnauthorizedException('Account is suspended'). Also add the check in JwtStrategy.validate() to invalidate tokens for users suspended after initial login.

**Affected files:** `apps/api/src/core/auth/auth.service.ts`

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
