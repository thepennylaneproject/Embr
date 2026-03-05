# Finding: f-ux-f-016

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

Loading states inconsistent — plain `<p>` text on 3 pages, PageState component on others

## Description

Multiple pages show loading feedback as plain paragraph text without the PageState component: pages/gigs/[id].tsx uses '<p>Loading gig...</p>', pages/[username].tsx uses '<p>Loading profile...</p>', pages/profile/index.tsx uses '<p className="text-gray-600">Loading profile...</p>'. Other pages (e.g. feed.tsx via FeedTabs, forgot-password.tsx, reset-password.tsx, marketplace/[id].tsx) use the PageState component. This is visually jarring and creates an inconsistent user experience during data fetches.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/gigs/[id].tsx`

- Lines: 30-30


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Replace plain loading <p> tags with <PageState type='loading' title='...' /> to ensure visual and semantic consistency across all pages.

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
