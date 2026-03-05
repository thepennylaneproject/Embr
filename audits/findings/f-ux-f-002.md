# Finding: f-ux-f-002

> **Status:** open | **Severity:** blocker | **Priority:** P0 | **Type:** bug | **Confidence:** inference

## Title

DiscoveryPage.tsx navigates to non-existent route `/profile/${username}`

## Description

DiscoveryPage's handleUserClick calls router.push(`/profile/${user.username}`). No such route exists — the public profile route is `/[username]` (e.g. `/sarahsahl`), not `/profile/sarahsahl`. Every user-click in the discovery UI silently 404s.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/DiscoveryPage.tsx`

- Lines: 18-18


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Change to router.push(`/${user.username}`) to match the [username].tsx dynamic route.

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
