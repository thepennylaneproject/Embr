# Finding: f-security-f-019

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

Auth cookies use sameSite: 'lax' and secure flag depends on NODE_ENV

## Description

Both accessToken and refreshToken cookies are set with sameSite: 'lax' and secure: process.env.NODE_ENV === 'production'. The 'lax' setting is weaker than 'strict' for auth-specific cookies. The secure flag is absent in any environment where NODE_ENV is not explicitly set to 'production', meaning cookies are transmitted without the Secure attribute in staging deployments that use HTTP.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/auth/auth.controller.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Change sameSite to 'strict'. Replace secure: process.env.NODE_ENV === 'production' with a dedicated env var: secure: process.env.COOKIE_SECURE === 'true'. Set COOKIE_SECURE=true in all non-local environments. Add a startup validation that COOKIE_SECURE is explicitly set.

**Affected files:** `apps/api/src/core/auth/auth.controller.ts`

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
