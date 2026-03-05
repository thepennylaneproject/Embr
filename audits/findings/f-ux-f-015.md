# Finding: f-ux-f-015

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

music/artist/[id].tsx error state is dead code — `_setError` prefixed, never called

## Description

pages/music/artist/[id].tsx declares `const [error, _setError] = useState<string | null>(null)`. The underscore prefix is a TypeScript convention indicating the setter is intentionally unused. The error UI branch (which renders a red error card) can never be shown to the user regardless of what goes wrong loading the artist profile. All failures silently show the skeleton loader forever.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/music/artist/[id].tsx`

- Lines: 9-9


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Wire _setError to the fetchArtist error catch block. Rename to setError. Ensure the error UI is shown when the artist profile fails to load, with a back link to /music.

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
