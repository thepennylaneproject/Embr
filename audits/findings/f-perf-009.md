# Finding: f-perf-009

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** enhancement | **Confidence:** evidence

## Title

Search flows trigger redundant network calls due missing/duplicate debounce patterns

## Description

Marketplace search refetches on every filter keystroke, music track search fetches on each query change, and user search is double-debounced (component + hook), increasing latency and waste.

## Proof Hooks

### [code_ref] Marketplace effect reloads on each input dependency change

- File: `apps/web/src/pages/marketplace/index.tsx`

- Symbol: `useEffect(load)`

- Lines: 36-36

### [code_ref] Track search fetches immediately on query change

- File: `apps/web/src/components/music/hooks/useMusic.ts`

- Symbol: `useSearchTracks`

- Lines: 155-157

### [code_ref] UserSearchBar and useUserSearch both debounce 300ms

- File: `apps/web/src/components/social/UserSearchBar.tsx`

- Symbol: `useDebounce/searchUsers`

- Lines: 29-45

### [code_ref] Additional debounce in hook

- File: `apps/web/src/hooks/useUserSearch.ts`

- Symbol: `searchUsers`

- Lines: 57-67


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Higher API volume and slower perceived search responsiveness.


## Suggested Fix

**Approach:** Use one debounce layer only, add request cancellation, and trigger marketplace fetch on submit/settled debounce instead of every keypress.

**Affected files:** `apps/web/src/pages/marketplace/index.tsx` `apps/web/src/components/music/hooks/useMusic.ts` `apps/web/src/components/social/UserSearchBar.tsx` `apps/web/src/hooks/useUserSearch.ts`

**Effort:** small

**Risk:** Minimal behavior changes if thresholds are tuned.


## Tests Needed

- [ ] Debounce behavioral tests and API-call count assertions per input sequence


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
