# Finding: f-security-f-015

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

CORS falls back to localhost origins if ALLOWED_ORIGINS is unset in production

## Description

The CORS origin whitelist defaults to 'http://localhost:3000,http://localhost:3001,http://localhost:3004' if ALLOWED_ORIGINS is not set. In a production deployment where this env var is absent, legitimate production-domain requests are blocked while localhost origins are permitted.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/main.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** At startup, validate that ALLOWED_ORIGINS is set in production: if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) { throw new Error('ALLOWED_ORIGINS must be explicitly set in production'); }. Remove localhost origins from any fallback default.

**Affected files:** `apps/api/src/main.ts`

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
