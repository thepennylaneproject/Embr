# Finding: f-data-data-f012

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

revenueService.recordStream() stores a USD float as TrackPlay.royaltyAmount which is declared Int (cents) in Prisma schema

## Description

revenueService.recordStream() computes royaltyAmount = isValidStream ? 0.003 : 0 (a USD dollar float) and persists it to TrackPlay.royaltyAmount. The Prisma schema declares TrackPlay.royaltyAmount as Int (integer cents). Prisma silently truncates the float to 0, making all stream royalty earnings zero regardless of playback.

## Proof Hooks

### [code_ref] royaltyAmount computed as USD float 0.003 and stored via TrackPlay.create

- File: `apps/api/src/music/services/musicService.ts`

### [code_ref] TrackPlay.royaltyAmount is Int — amount artist earned from this play (in cents)

- File: `apps/api/prisma/schema.prisma`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Every stream play will have royaltyAmount = 0, silently zeroing all artist royalty earnings from streaming.


## Suggested Fix

**Approach:** Two fixes required: (1) store royaltyAmount in integer cents consistently with the schema (multiply by 100). (2) Note that $0.003/stream = 0.3 cents, which truncates to 0 even in cents — the royalty rate must be raised to at least $0.01/stream, or the schema must use millicents (Int) with documentation.

**Affected files:** `apps/api/src/music/services/musicService.ts`

**Effort:** 

**Risk:** 


## Tests Needed

- [ ] Add targeted verification tests/checks


## Related Findings

_(none)_


## Timeline

- 2026-03-06T18:39:01Z | schema-auditor | created | History synthesized by SYNTHESIZER due to missing history field. Validation issues: history is empty or missing
- 2026-03-06T18:39:01Z | schema-auditor | created | New finding from schema-auditor in run synthesized-20260306-183901. Original agent ID: data-f012


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
