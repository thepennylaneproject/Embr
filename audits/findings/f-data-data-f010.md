# Finding: f-data-data-f010

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Marketplace checkout/order flow can partially commit and oversell stock

## Description

checkout() loops item-by-item creating orders without all-or-nothing transaction. markPaid() decrements listing quantity without guarding against concurrent underflow.

## Proof Hooks

### [code_ref] sequential createOrder loop in checkout; quantity decrement in markPaid without conditional guard

- File: `apps/api/src/verticals/marketplace/services/orders.service.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Partial cart creation, inconsistent customer state, and negative inventory under concurrency.


## Suggested Fix

**Approach:** Use transaction for full checkout and conditional stock decrement (where: { id, quantity: { gte: order.quantity } }) with retry logic.

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
