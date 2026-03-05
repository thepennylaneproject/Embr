# Finding: f-ux-f-007

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

15 uses of `alert()` and `prompt()` across 7 files block screen readers and break UX flow

## Description

Browser-native alert() and prompt() dialogs are inaccessible to screen readers, block the JavaScript thread, cannot be styled, and are blocked by many browser policies on mobile. Found in: GigManagementDashboard (4x for cancel/complete/withdraw/milestone errors), PayoutRequest (2x for validation), TipButton (2x for min/max validation), MessageInput (3x for file errors), marketplace/[id].tsx (3x for order/offer outcomes), groups/[id]/settings.tsx (1x for delete error), marketplace/orders.tsx (1x prompt for tracking number), StripeConnectOnboarding.tsx (1x prompt for email).

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/components/gigs/GigManagementDashboard.tsx:66,75,86,95`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Replace all alert() calls with showToast({kind:'error',...}). Replace prompt() calls with inline form fields or a proper Modal component (which already exists in components/ui/Modal.tsx with full focus-trap and keyboard support).

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
