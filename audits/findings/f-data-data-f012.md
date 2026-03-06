# Finding: f-data-data-f012

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

`revenueService.recordStream()` stores a USD float as `TrackPlay.royaltyAmount` which is declared Int (cents) in Prisma schema

## Description

`revenueService.recordStream()` in the music module computes `royaltyAmount = isValidStream ? 0.003 : 0` (a USD dollar amount as a floating-point value) and then persists it directly to `TrackPlay.royaltyAmount`. The Prisma schema declares that column as `Int` (integer cents). Prisma will silently truncate the float to `0`, meaning every recorded stream will show zero royalty earnings regardless of playback.

## Proof Hooks

### [code_ref] royaltyAmount computed as USD float 0.003

- File: `apps/api/src/music/services/musicService.ts`

### [code_ref] TrackPlay.royaltyAmount is Int (cents)

- File: `apps/api/prisma/schema.prisma`


## Reproduction Steps

1. POST a valid stream play event with `durationPlayed >= 30` to the music streaming endpoint
2. Query `TrackPlay.royaltyAmount` for the resulting record
3. Observe the stored value is `0` — Prisma truncates the float `0.003` to the integer `0` when writing to the `Int` column


## Impact

Every stream play persisted via `recordStream` will have `royaltyAmount = 0`, causing all royalty reports and artist revenue calculations to be wrong. This silently corrupts the financial ledger for every track stream.


## Suggested Fix

**Approach:** Two complementary fixes are required:
1. Store `royaltyAmount` in integer cents consistently with the Prisma schema declaration (e.g., `royaltyAmount = isValidStream ? Math.round(rate * 100) : 0`).
2. The current rate of `$0.003/stream` equals `0.3` cents, which truncates to `0` even in cents. The royalty rate must be raised to at least `$0.01/stream` (= 1 cent) to produce a non-zero integer amount, **or** the schema should be changed to store in millicents (thousandths of a cent) as an `Int` with appropriate documentation.

**Affected files:** `apps/api/src/music/services/musicService.ts`

**Effort:** low

**Risk:** Data already in `TrackPlay` will have wrong (zero) royaltyAmount values — a one-time backfill migration will be needed for existing rows.


## Tests Needed

- [ ] Unit test: verify `recordStream()` stores royaltyAmount in integer cents
- [ ] Unit test: verify `royaltyAmount = 0` when `durationPlayed < 30`


## Related Findings

| ID | Relationship |
|----|-------------|
| f-data-data-f006 | Same root cause — float vs. Int money fields misuse |
| f-data-data-f014 | Companion finding: monetary Float inconsistency in new music models |


## Timeline

- 2026-03-06T06:01:28Z | schema-auditor | created | New finding from data audit run data-20260306-060128


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
