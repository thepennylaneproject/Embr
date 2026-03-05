# Finding: f-ux-f-009

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Toast system supports only `'info' | 'error'` — no `'success'` or `'warning'` variant

## Description

Toast.tsx defines ToastKind as 'info' | 'error'. There is no 'success' kind. Successful operations (profile saved, listing published, group created, order placed) fall back to kind:'info' which uses the same visual style as informational messages. Users cannot distinguish a success confirmation from a neutral notification. There is also no 'warning' kind for soft failures.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/components/ui/Toast.tsx`

- Lines: 4-4


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Add 'success' and 'warning' to ToastKind. Style them with distinct colors (green for success, amber for warning) using CSS data-kind attribute. Update callers that use kind:'info' for success operations.

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
