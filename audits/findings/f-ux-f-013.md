# Finding: f-ux-f-013

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

Safety page exposes raw internal 'user ID' input fields — not user-addressable

## Description

pages/safety/index.tsx presents 'Block a user' and 'Mute a user' forms that ask users to 'Enter user ID'. Internal UUIDs/integer IDs are not something users know or can easily look up. The input also accepts a raw 'Entity ID' for the Report Content action. Users have no contextual help on where to find these IDs, making the safety features functionally unusable.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/safety/index.tsx`

- Lines: 51-64


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Replace ID text inputs with username search (the UserSearchBar component already exists at components/social/UserSearchBar.tsx). Use the resolved user ID internally, never expose it. Report content should be triggered from content cards, not a standalone form requiring IDs.

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
