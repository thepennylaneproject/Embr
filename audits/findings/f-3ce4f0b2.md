# Finding: f-3ce4f0b2

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

FeedType parameter is ignored in content API client

## Description

getFeed strips feedType and never routes to /posts/following or trending-specific behavior. Callers can pass FeedType.FOLLOWING/TRENDING but receive default /posts/feed behavior.

## Proof Hooks

### [code_ref] feedType destructured then discarded

- File: `apps/web/src/shared/api/content.api.ts`

- Symbol: `getFeed`

- Lines: 186-191

### [code_ref] Backend exposes distinct following endpoint

- File: `apps/api/src/verticals/feeds/content/controllers/posts.controller.ts`

- Symbol: `getFollowingFeed`

- Lines: 76-86


## Reproduction Steps

1. Call useFeed with feedType='following'.

2. Observe outgoing request targets /posts/feed without following specialization.

3. Compare with direct call to /posts/following and note behavioral mismatch.


## Impact

Feed mode selection can silently return wrong data set.


## Suggested Fix

**Approach:** Route by feedType in getFeed (for-you => /posts/feed, following => /posts/following, trending => mapped endpoint) or include explicit backend query contract.

**Affected files:** `apps/web/src/shared/api/content.api.ts`

**Effort:** small

**Risk:** Medium; ensure backwards compatibility for current consumers.


## Tests Needed

- [ ] Unit test: feedType FOLLOWING calls /posts/following.

- [ ] Unit test: feedType FOR_YOU calls /posts/feed.

- [ ] Integration test: mode-switching UI reflects distinct datasets.


## Related Findings

_(none)_


## Timeline

- 2026-03-05T13:26:27Z | runtime-bug-hunter | created | Direct mismatch between API abstraction and backend routing.


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
