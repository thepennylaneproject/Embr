# Finding: f-ux-f-001

> **Status:** open | **Severity:** blocker | **Priority:** P0 | **Type:** bug | **Confidence:** inference

## Title

Broken route `/feeds` in create.tsx — 404 dead end

## Description

pages/create.tsx references the route `/feeds` in two places: the `handleCancel` callback (router.push('/feeds')) and the breadcrumb href. The actual route is `/feed` (singular). A user who cancels a post creation or clicks the breadcrumb is sent to a 404 page with no recovery path.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/create.tsx`

- Lines: 15-15


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Change both `/feeds` references to `/feed` in create.tsx.

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
