# Finding: f-data-data-f014

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

ArtistStat.revenue and Track.price use Float (USD) while the rest of the platform uses Int (integer cents) for all monetary values

## Description

The music vertical introduced ArtistStat.revenue (Float, in USD) and Track.price (Float, in USD). Every other monetary field in the schema (Wallet.balance, Transaction.amount, Payout.amount, Escrow.amount, GigMilestone.amount, MarketplaceListing.price, VideoUsage.totalRevenue, VideoUsage.originalArtistShare, etc.) uses Int (integer cents). This creates a dual-unit money model where cross-domain revenue aggregation code will produce 100x scaling errors.

## Proof Hooks

### [code_ref] ArtistStat.revenue Float @default(0) // In USD; Track.price Float @default(0) // 0 = free, otherwise in USD

- File: `apps/api/prisma/schema.prisma`

### [code_ref] VideoUsage.totalRevenue Int, VideoUsage.originalArtistShare Int, VideoUsage.creatorShare Int, VideoUsage.platformShare Int — all in cents

- File: `apps/api/prisma/schema.prisma`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Cross-domain revenue aggregation code will produce 100x incorrect totals. Float storage introduces rounding errors. Inconsistent units make financial auditing and correctness verification impossible without field-level unit tracking.


## Suggested Fix

**Approach:** Convert Track.price and ArtistStat.revenue to Int (cents) via a migration that multiplies existing values by 100. Update all service code to use cents. Establish a platform-wide convention that all monetary fields are in integer cents.

**Affected files:** `apps/api/prisma/schema.prisma`, `apps/api/src/music/services/musicService.ts`

**Effort:** 

**Risk:** 


## Tests Needed

- [ ] Add targeted verification tests/checks


## Related Findings

_(none)_


## Timeline

- 2026-03-06T18:39:01Z | schema-auditor | created | History synthesized by SYNTHESIZER due to missing history field. Validation issues: history is empty or missing
- 2026-03-06T18:39:01Z | schema-auditor | created | New finding from schema-auditor in run synthesized-20260306-183901. Original agent ID: data-f014


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
