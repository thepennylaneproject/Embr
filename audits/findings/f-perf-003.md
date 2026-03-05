# Finding: f-perf-003

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Comment formatting performs per-comment like lookup

## Description

Each comment calls `like.findUnique` in `formatComment`, creating N additional queries for paginated comment lists.

## Proof Hooks

### [code_ref] Map over comments calls formatter with async like lookup

- File: `apps/api/src/verticals/feeds/content/services/comments.service.ts`

- Symbol: `getComments/formatComment`

- Lines: 156-463

### [data_shape] Expected single prefetch of likes for visible comment IDs

- Expected: 1 query for comments + 1 query for all likes by user on those comment IDs

- Actual: 1 query for comments + N `findUnique` like checks


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Comment pages degrade in latency with larger page sizes and high engagement.


## Suggested Fix

**Approach:** Prefetch liked comment IDs using `where: { userId, commentId: { in: [...] } }` and compute `isLiked` from a Set.

**Affected files:** `apps/api/src/verticals/feeds/content/services/comments.service.ts`

**Effort:** small

**Risk:** Low risk.


## Tests Needed

- [ ] Integration test ensuring `isLiked` correctness for mixed liked/unliked comments


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
