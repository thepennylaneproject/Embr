# Finding: f-data-data-f009

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Tip completion uses nested transactions across different Prisma contexts

## Description

TipService.completeTip() starts this.prisma.$transaction(tx => ...) but calls transactionService.recordTipTransaction(), which itself opens this.prisma.$transaction(...) and is not bound to tx.

## Proof Hooks

### [code_ref] calls transactionService.recordTipTransaction inside tx callback

- File: `apps/api/src/core/monetization/services/tip.service.ts`

### [code_ref] recordTipTransaction uses independent this.prisma.$transaction

- File: `apps/api/src/core/monetization/services/transaction.service.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Ledger and wallet/tip state can diverge if inner/outer transaction phases fail independently.


## Suggested Fix

**Approach:** Pass transaction client through service methods or centralize all ledger+tip+wallet writes in one transaction boundary.

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
