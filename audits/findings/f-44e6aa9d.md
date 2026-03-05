# Finding: f-44e6aa9d

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

CacheService getOrSet treats valid falsy cache values as cache misses

## Description

getOrSet checks if (cached) rather than null/undefined. Cached false, 0, or empty string are treated as miss and recomputed, breaking correctness for boolean/numeric sentinel cache values.

## Proof Hooks

### [code_ref] Truthy check used for cache-hit decision

- File: `apps/api/src/core/cache/cache.service.ts`

- Symbol: `getOrSet`

- Lines: 173-178


## Reproduction Steps

1. Cache a key with value false (or 0).

2. Call getOrSet for same key.

3. Observe fn executes again instead of returning cached falsy value.


## Impact

Incorrect behavior and repeated expensive recomputation for legitimate falsy cached values.


## Suggested Fix

**Approach:** Use explicit null check (cached !== null) or sentinel wrappers for cache entries.

**Affected files:** `apps/api/src/core/cache/cache.service.ts`

**Effort:** trivial

**Risk:** Low.


## Tests Needed

- [ ] Unit test: getOrSet returns cached false.

- [ ] Unit test: getOrSet returns cached 0.

- [ ] Unit test: fn called only when cached is null.


## Related Findings

_(none)_


## Timeline

- 2026-03-05T13:26:27Z | runtime-bug-hunter | created | Logic bug in cache hit detection.


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
