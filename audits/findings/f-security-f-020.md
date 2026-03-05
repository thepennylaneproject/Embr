# Finding: f-security-f-020

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

ENABLE_DETAILED_ERRORS and ENABLE_SWAGGER default to true in example configs

## Description

Both example files set ENABLE_SWAGGER=true and ENABLE_DETAILED_ERRORS=true with no production warning. If these values are copied to production .env files without review, the API exposes full stack traces in 500 responses and a publicly accessible Swagger UI at /docs.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `.env.example`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Change the example file defaults to ENABLE_SWAGGER=false and ENABLE_DETAILED_ERRORS=false with comments: # MUST be false in production. Add startup validation: if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DETAILED_ERRORS === 'true') throw new Error('ENABLE_DETAILED_ERRORS must be false in production').

**Affected files:** `.env.example` `apps/api/.env.example`

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
