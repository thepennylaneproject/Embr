# Finding: f-data-data-f013

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Music `AudioQuality` type uses lowercase/mismatched values vs. Prisma enum; service writes unvalidated string with `as any` cast

## Description

The music vertical's TypeScript `AudioQuality` interface defines quality values as `'low' | 'standard' | 'high' | 'lossless'` (lowercase). The Prisma schema defines the `AudioQuality` enum with uppercase values `LOW | STANDARD | HIGH | HIRES`. The value `'lossless'` has no equivalent at all — the DB enum uses `'HIRES'` for the highest quality tier.

`revenueService.recordStream()` accepts `quality` as an untyped `string` parameter and writes it to Prisma via `quality: quality as any`, bypassing all enum validation. Any caller can pass an invalid quality string (e.g., `"lossless"`, `"high"`, or an arbitrary value) which Prisma will reject at the DB layer with a runtime error, or in some configurations silently corrupt the row.

## Proof Hooks

### [code_ref] AudioQuality interface uses lowercase + 'lossless'

- File: `apps/api/src/music/types/index.ts`

### [code_ref] Prisma AudioQuality enum uses uppercase + HIRES

- File: `apps/api/prisma/schema.prisma`

### [code_ref] `quality: quality as any` unsafe cast in recordStream

- File: `apps/api/src/music/services/musicService.ts`


## Reproduction Steps

1. Call `revenueService.recordStream(trackId, userId, 60, 'lossless')` — `'lossless'` is a valid music types value but is not a valid Prisma enum value
2. Observe a Prisma/DB runtime error (invalid enum input value for type `AudioQuality`)


## Impact

Invalid enum values can cause runtime DB errors or silent data corruption for any stream record where the caller uses the music-module TypeScript type values directly. The `as any` cast means TypeScript provides no compile-time protection.


## Suggested Fix

**Approach:** 
1. Reconcile the TypeScript type and Prisma enum: rename `'lossless'` → `'HIRES'` and make all values uppercase (matching the Prisma enum).
2. Replace the untyped `string` parameter with the Prisma-generated `AudioQuality` enum type.
3. Remove the `as any` cast — if the types are aligned it becomes unnecessary.

**Affected files:** `apps/api/src/music/services/musicService.ts` `apps/api/src/music/types/index.ts`

**Effort:** low

**Risk:** Any existing callers using the old lowercase string values will need to be updated.


## Tests Needed

- [ ] Unit test: `recordStream` rejects invalid quality string values
- [ ] Unit test: `recordStream` accepts all four valid Prisma AudioQuality values


## Related Findings

| ID | Relationship |
|----|-------------|
| f-data-data-f005 | Same pattern: lowercase DTO enum values vs uppercase Prisma enums |


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
