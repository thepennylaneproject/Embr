# Finding: f-data-data-f014

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

`ArtistStat.revenue` and `Track.price` use `Float` (USD) while the rest of the platform uses `Int` (integer cents) for all monetary values

## Description

The music vertical introduced two new monetary fields that use `Float` (DOUBLE PRECISION) instead of integer cents:

- `Track.price Float @default(0) // 0 = free, otherwise in USD`
- `ArtistStat.revenue Float @default(0) // In USD`

Every other monetary field in the schema — wallet balances, transaction amounts, payout amounts, marketplace listing prices, escrow amounts, milestone amounts — uses `Int` (integer cents). This inconsistency creates a dual-unit money model: some code works in USD floats and other code works in cents, making cross-domain calculations error-prone and subject to rounding loss.

Additionally, `ArtistStat.revenue` stores aggregated artist revenue in the same column as `Track.price`, both in "USD float", while `VideoUsage.totalRevenue`, `VideoUsage.originalArtistShare`, `VideoUsage.creatorShare`, and `VideoUsage.platformShare` are all correctly declared as `Int` (cents). This means revenue from video usage is in cents, but the `ArtistStat` aggregate is in USD floats — no consistent unit.

## Proof Hooks

### [code_ref] ArtistStat.revenue Float and Track.price Float

- File: `apps/api/prisma/schema.prisma`

### [code_ref] VideoUsage.totalRevenue and splits are Int (cents)

- File: `apps/api/prisma/schema.prisma`

### [code_ref] All other monetary columns (Wallet.balance, Transaction.amount, Payout.amount, etc.) are Int (cents)

- File: `apps/api/prisma/schema.prisma`


## Reproduction Steps

1. Record a VideoUsage revenue split — values stored in cents (e.g., `totalRevenue = 500` for $5.00)
2. Read `ArtistStat.revenue` — value stored in USD float (e.g., `revenue = 5.0` for $5.00)
3. Any code that sums these two fields will produce a 100× error


## Impact

Cross-domain revenue aggregation code will produce incorrect totals. Float storage introduces rounding errors for accumulated revenue. Inconsistent units make correctness verification difficult and increase the risk of financial errors.


## Suggested Fix

**Approach:** Convert `Track.price` and `ArtistStat.revenue` to `Int` (cents) throughout:
1. Add a migration changing both columns to `INTEGER` (multiply existing values by 100).
2. Update any service code that reads or writes these fields to use cents.
3. Document the canonical unit (cents) in a shared money-handling utility or schema comment convention.

**Affected files:** `apps/api/prisma/schema.prisma` `apps/api/src/music/services/musicService.ts`

**Effort:** medium

**Risk:** Requires a data migration — existing Float values in `Track.price` and `ArtistStat.revenue` must be multiplied by 100. Rollback must preserve original values.


## Tests Needed

- [ ] Verify that after migration, `Track.price = 0` (free) still reads as `0`
- [ ] Verify that `ArtistStat.revenue` aggregation from VideoUsage integer cents is consistent


## Related Findings

| ID | Relationship |
|----|-------------|
| f-data-data-f003 | Prior monetary type conversion migration risk |
| f-data-data-f006 | Float validation for integer money fields in gig/payout DTOs |
| f-data-data-f012 | royaltyAmount also stored as float in an Int column |


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
