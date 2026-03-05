# Finding: f-security-f-018

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

Actual default Redis password committed in .env.example

## Description

apps/api/.env.example sets REDIS_PASSWORD=embr_redis_password — a real password value, not a placeholder. Any developer who copies .env.example to .env without changing this value deploys with a publicly known credential.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/.env.example`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Replace REDIS_PASSWORD=embr_redis_password with REDIS_PASSWORD=CHANGE_ME_BEFORE_DEPLOY in both .env.example files. Add a startup check: if (process.env.REDIS_PASSWORD === 'CHANGE_ME_BEFORE_DEPLOY') throw new Error('Default Redis password must be changed before deployment').

**Affected files:** `apps/api/.env.example`

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
