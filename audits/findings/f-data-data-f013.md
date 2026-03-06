# Finding: f-data-data-f013

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Music AudioQuality type uses lowercase/mismatched values vs. Prisma enum; service writes unvalidated string with `as any` cast

## Description

The music module's TypeScript AudioQuality interface defines quality as 'low'|'standard'|'high'|'lossless' while the Prisma enum uses LOW|STANDARD|HIGH|HIRES. The value 'lossless' has no DB equivalent (HIRES is the closest). revenueService.recordStream() accepts quality as a raw string and writes quality: quality as any, bypassing all enum validation. Any caller using the TypeScript type values directly will get runtime DB errors.

## Proof Hooks

### [code_ref] AudioQuality interface uses lowercase values including 'lossless'

- File: `apps/api/src/music/types/index.ts`

### [code_ref] AudioQuality enum uses uppercase: LOW, STANDARD, HIGH, HIRES

- File: `apps/api/prisma/schema.prisma`

### [code_ref] quality: quality as any unsafe cast bypasses enum validation

- File: `apps/api/src/music/services/musicService.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Invalid enum values cause runtime DB errors for stream records where the caller uses lowercase string values. The `as any` cast eliminates compile-time protection.


## Suggested Fix

**Approach:** Reconcile the TypeScript type with the Prisma enum: rename 'lossless' to 'HIRES', use uppercase for all values. Replace the untyped string parameter with the Prisma-generated AudioQuality enum type and remove the `as any` cast.

**Affected files:** `apps/api/src/music/services/musicService.ts`, `apps/api/src/music/types/index.ts`

**Effort:** 

**Risk:** 


## Tests Needed

- [ ] Add targeted verification tests/checks


## Related Findings

_(none)_


## Timeline

- 2026-03-06T18:39:01Z | schema-auditor | created | History synthesized by SYNTHESIZER due to missing history field. Validation issues: history is empty or missing
- 2026-03-06T18:39:01Z | schema-auditor | created | New finding from schema-auditor in run synthesized-20260306-183901. Original agent ID: data-f013


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
