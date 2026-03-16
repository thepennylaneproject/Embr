# Finding: f-data-data-f008

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Gig application acceptance flow is non-atomic and race-prone

## Description

Accept flow performs updateMany reject, accept single app, mark gig in progress, create escrow, then create milestones as separate operations without a shared transaction/lock.

## Proof Hooks

### [code_ref] accept() does multi-step writes across tables/services without transaction

- File: `apps/api/src/verticals/gigs/services/applications.service.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Partial state (accepted app with missing escrow/milestones) and potential double-accept under concurrency.


## Suggested Fix

**Approach:** Wrap all acceptance side effects in a single serializable transaction and enforce compare-and-set on gig/application statuses.

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
