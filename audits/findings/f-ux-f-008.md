# Finding: f-ux-f-008

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Inline modals in marketplace/[id].tsx and orders.tsx missing ARIA dialog semantics

## Description

The Buy, Offer, and Review modals in marketplace pages are hand-rolled div overlays without role="dialog", aria-modal="true", or aria-labelledby. Focus is not trapped. Pressing Escape does not close them. Screen readers do not announce the dialog or prevent interaction with content behind it. The project already has a properly-implemented Modal component (components/ui/Modal.tsx) with full ARIA and focus-trap support that is not being used.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/marketplace/[id].tsx`

- Lines: 142-230


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Replace all inline modal divs with the existing <Modal> component from components/ui/Modal.tsx.

**Affected files:** _none specified_

**Effort:** small

**Risk:** 


## Tests Needed

- [ ] Add targeted verification tests/checks


## Related Findings

_(none)_


## Timeline

- 2026-03-05T19:44:51.494026Z | ux-flow-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
