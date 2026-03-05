# Finding: f-ux-f-004

> **Status:** open | **Severity:** blocker | **Priority:** P0 | **Type:** bug | **Confidence:** inference

## Title

DiscoveryPage.tsx creates route `/DiscoveryPage` — unreachable from navigation

## Description

Next.js pages/ directory routes map case-sensitively to filenames. The file pages/DiscoveryPage.tsx generates the route /DiscoveryPage (capital D, capital P). No nav item, link, or breadcrumb anywhere in the app points to /DiscoveryPage. The entire discovery UI is orphaned and inaccessible to users. AppShell nav does not include a Discover link.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/DiscoveryPage.tsx`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Rename file to pages/discover.tsx (or pages/discovery/index.tsx) and add a 'Discover' nav item to AppShell.

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
