# Finding: f-7d31b8aa

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

useFeed abort logic is ineffective because signal is never passed to API request

## Description

Hook creates and aborts AbortController instances, and handles AbortError, but getFeed calls do not receive signal. Abort path is effectively dead and overlapping requests still run to completion.

## Proof Hooks

### [code_ref] AbortController created/aborted in hook

- File: `apps/web/src/hooks/useFeed.ts`

- Symbol: `loadFeed`

- Lines: 63-77

### [code_ref] contentApi.getFeed does not accept/forward AbortSignal

- File: `apps/web/src/shared/api/content.api.ts`

- Symbol: `getFeed`

- Lines: 186-192


## Reproduction Steps

1. Trigger multiple rapid feed loads (navigation/refresh spam).

2. Observe all requests complete despite abort calls.

3. Confirm AbortError branch is never hit in hook.


## Impact

Race windows and stale response overwrites remain possible despite apparent cancellation logic.


## Suggested Fix

**Approach:** Add optional signal to contentApi.getFeed and pass it into axios request config; keep request-id guard to ignore stale completions.

**Affected files:** `apps/web/src/hooks/useFeed.ts` `apps/web/src/shared/api/content.api.ts`

**Effort:** small

**Risk:** Low.


## Tests Needed

- [ ] Hook/API test: aborted feed request rejects with cancellation and does not update state.

- [ ] Hook test: latest request wins under rapid sequential calls.


## Related Findings

- `f-0d7c9a12`


## Timeline

- 2026-03-05T13:26:27Z | runtime-bug-hunter | created | Dead cancellation path confirmed by code flow.


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
