# Finding: f-c1a54d8e

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Music SDK retry interceptor can throw secondary TypeError when error.config is missing

## Description

Retry logic assumes error.config exists and accesses retryCount on it. For errors without config, interceptor may throw before original error handling, masking root failure and breaking caller expectations.

## Proof Hooks

### [code_ref] config assumed non-null in retry path

- File: `packages/music-sdk/src/client.ts`

- Symbol: `response interceptor`

- Lines: 165-187


## Reproduction Steps

1. Trigger an Axios error in SDK where config is undefined/null (mocked transport-level failure).

2. Observe interceptor attempting to read/set retryCount on missing config.

3. Confirm thrown error is secondary TypeError, not original API/network error.


## Impact

Error handling becomes unstable and obscures true failure causes for SDK consumers.


## Suggested Fix

**Approach:** Guard if (!config) throw normalized MusicApiError before retry logic; avoid mutating undefined config.

**Affected files:** `packages/music-sdk/src/client.ts`

**Effort:** small

**Risk:** Low.


## Tests Needed

- [ ] Unit test: interceptor handles missing config without TypeError.

- [ ] Unit test: transient errors with config still retry up to maxRetries.


## Related Findings

_(none)_


## Timeline

- 2026-03-05T13:26:27Z | runtime-bug-hunter | created | Shared package runtime safety issue.


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
