# Finding: f-ux-f-011

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

Homepage H1 reads 'Embr Frontend' — developer placeholder visible to all users

## Description

pages/index.tsx renders <h1 className='ui-page-title'>Embr Frontend</h1>. 'Embr Frontend' is a developer label for the app shell scaffold, not a user-facing product name. Every unauthenticated visitor sees this as the first words on the landing page.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/index.tsx`

- Lines: 11-11


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Replace with the product value proposition, e.g. 'Embr — Built for Creators' or simply 'Embr'. Match the mission/brand voice established in MISSION.md.

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
