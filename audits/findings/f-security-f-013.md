# Finding: f-security-f-013

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Evidence of auth tokens previously or currently stored in localStorage

## Description

clearAuthStorage() in the API client calls localStorage.removeItem('accessToken') and localStorage.removeItem('refreshToken'). This cleanup code would be unnecessary if tokens were never stored in localStorage. The function's existence confirms that at least one code path writes auth tokens to localStorage, where they are accessible to any JavaScript on the same origin.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/lib/api/client.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Search the entire codebase for localStorage.setItem('accessToken') and localStorage.setItem('refreshToken'). Remove every such call. Tokens must only be set as httpOnly cookies by the server. Remove clearAuthStorage() after confirming no setItem calls remain.

**Affected files:** `apps/web/src/lib/api/client.ts`

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
