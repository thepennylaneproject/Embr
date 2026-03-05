# Finding: f-perf-008

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** enhancement | **Confidence:** evidence

## Title

Feed rerender pressure from unstable callbacks and non-memoized post cards

## Description

`useFeed` action callbacks depend on `posts`, changing references frequently; `Feed` passes these into every `PostCard`, which is not memoized and also creates inline handlers.

## Proof Hooks

### [code_ref] Action callbacks close over posts array

- File: `apps/web/src/hooks/useFeed.ts`

- Symbol: `likePost/unlikePost/incrementCommentCount/incrementShareCount`

- Lines: 174-252

### [code_ref] Post list maps all PostCard children with changing handlers

- File: `apps/web/src/components/content/Feed.tsx`

- Symbol: `Feed render`

- Lines: 176-186

### [code_ref] PostCard includes inline click closures and local like state

- File: `apps/web/src/components/content/PostCard.tsx`

- Symbol: `PostCard`

- Lines: 213-241


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Higher commit time and dropped frames on long feeds.


## Suggested Fix

**Approach:** Use stable action dispatchers (state updater form), memoize `PostCard` (`React.memo`), and pass stable handler references.

**Affected files:** `apps/web/src/hooks/useFeed.ts` `apps/web/src/components/content/Feed.tsx` `apps/web/src/components/content/PostCard.tsx`

**Effort:** medium

**Risk:** Need to keep optimistic updates consistent.


## Tests Needed

- [ ] React profiler benchmark comparing rerender counts before/after


## Related Findings

_(none)_


## Timeline

- 2026-03-05T19:44:51.494026Z | performance-cost-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
