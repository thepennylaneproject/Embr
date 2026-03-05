# Finding: f-security-f-022

> **Status:** open | **Severity:** nit | **Priority:** P3 | **Type:** bug | **Confidence:** inference

## Title

Google OAuth callback uses unchecked FRONTEND_URL; web client points to wrong OAuth endpoint

## Description

The Google OAuth callback redirects to `${process.env.FRONTEND_URL}/auth/callback` without validating FRONTEND_URL is set — if unset, the redirect target is 'undefined/auth/callback'. Separately, the web client's googleLogin() function redirects users directly to /auth/google/callback instead of /auth/google, skipping the OAuth state initiation step which provides CSRF protection in the OAuth handshake.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/auth/auth.controller.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Validate FRONTEND_URL at startup. In the web client's googleLogin(), change the redirect target from /auth/google/callback to /auth/google.

**Affected files:** `apps/api/src/core/auth/auth.controller.ts` `apps/web/src/lib/api/auth.ts`

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
