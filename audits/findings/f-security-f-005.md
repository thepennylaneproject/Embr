# Finding: f-security-f-005

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Refresh tokens stored as plaintext JWTs in the database

## Description

generateTokens() stores the full signed JWT refresh token string in the RefreshToken table with no hashing. A database dump, compromised backup, or future SQL injection exposes every active refresh token. Each is valid for 30 days and can impersonate any logged-in user.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/auth/auth.service.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Store SHA-256(refreshToken) in the database instead of the raw value. On refresh, hash the incoming token before the database lookup: const hashed = crypto.createHash('sha256').update(token).digest('hex'). Query WHERE token = hashed.

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
