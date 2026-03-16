# Finding: f-data-data-f002

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Historical migration adds required columns without defaults

## Description

Migration adds Payout.walletId and Transaction.walletId as NOT NULL without defaults/backfill.

## Proof Hooks

### [code_ref] ALTER TABLE adds required walletId on existing tables

- File: `apps/api/prisma/migrations/20260207042211_init/migration.sql`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Migration can fail on non-empty databases, causing partial rollout and schema divergence.


## Suggested Fix

**Approach:** Use phased migration: add nullable column, backfill from existing relations, validate, then set NOT NULL.

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
