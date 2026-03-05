# Finding: f-data-data-f003

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Money-type conversions are sequenced in a way that risks irreversible value corruption

## Description

One migration casts monetary columns from float to int directly; a later migration multiplies values by 100 and casts again.

## Proof Hooks

### [code_ref] ALTER COLUMN amount/balance/... SET DATA TYPE INTEGER

- File: `apps/api/prisma/migrations/20260207042211_init/migration.sql`

### [code_ref] ALTER COLUMN ... TYPE INTEGER USING ROUND(column * 100)

- File: `apps/api/prisma/migrations/20260225232035_convert_to_integer_cents/migration.sql`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Precision loss or 100x scale inconsistencies depending on environment state and migration order history.


## Suggested Fix

**Approach:** Run one-time data audit comparing expected cents ranges, then ship corrective migration with explicit source-unit assumptions and rollback notes.

**Affected files:** _none specified_

**Effort:** medium

**Risk:** 


## Tests Needed

- [ ] Add targeted verification tests/checks


## Related Findings

_(none)_


## Timeline

- 2026-03-05T19:44:51.494026Z | schema-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
