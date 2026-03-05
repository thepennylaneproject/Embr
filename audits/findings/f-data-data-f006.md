# Finding: f-data-data-f006

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Validation allows decimals for integer money/file-size fields

## Description

DTOs use @IsNumber for fields that are Int in Prisma (budgetMin, budgetMax, proposedBudget, milestone amount, payout amount, etc.).

## Proof Hooks

### [code_ref] money fields validated as @IsNumber

- File: `apps/api/src/verticals/gigs/dto/gig.dto.ts`

### [code_ref] payout amount validated as @IsNumber

- File: `apps/api/src/core/monetization/dto/payout.dto.ts`

### [code_ref] corresponding columns are Int

- File: `apps/api/prisma/schema.prisma`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Inputs can pass validation and then fail at Prisma/DB or create implicit rounding semantics.


## Suggested Fix

**Approach:** Use @IsInt + explicit cent units in DTO docs/messages.

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
