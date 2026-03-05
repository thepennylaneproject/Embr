# Finding: f-ux-f-020

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

Order/offer error messages provide no actionable next step

## Description

marketplace/[id].tsx uses alert(e.response?.data?.message || 'Order failed') and alert(e.response?.data?.message || 'Offer failed') as the user-visible error message for failed purchases and offers. These fallback strings give the user no guidance on what happened or what to do next. Similarly, MessageInput uses alert('Failed to send message. Please try again.') with no details. Users cannot determine whether to retry, contact support, or check their payment method.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/marketplace/[id].tsx`

- Lines: 41-41


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Replace with inline error display near the relevant button. Use specific fallback messages: 'We couldn't place your order. Please check your payment method and try again.' Include a support link or retry button where appropriate.

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
