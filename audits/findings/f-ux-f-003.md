# Finding: f-ux-f-003

> **Status:** open | **Severity:** blocker | **Priority:** P0 | **Type:** bug | **Confidence:** inference

## Title

API error helper exposes internal localhost URL to end users

## Description

lib/api/error.ts returns the string `API unavailable at http://localhost:3003/api. Start the API server and try again.` when a network error occurs. This exposes infrastructure details (localhost, port 3003, path) to production users who have no ability to 'start the API server'. The message is used as the user-visible fallback across login, signup, and all form submissions.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/lib/api/error.ts`

- Lines: 6-9


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Return a user-friendly message such as 'Unable to connect. Please check your connection and try again.' Strip the internal URL entirely. Keep the dev detail in console.error only.

**Affected files:** _none specified_

**Effort:** small

**Risk:** 


## Tests Needed

- [ ] Add targeted verification tests/checks


## Related Findings

_(none)_


## Timeline

- 2026-03-05T19:44:51.494026Z | ux-flow-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
