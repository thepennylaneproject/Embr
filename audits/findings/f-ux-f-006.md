# Finding: f-ux-f-006

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

marketplace/sell.tsx has no post-publish navigation — user stranded after listing

## Description

pages/marketplace/sell.tsx passes createListing and publishListing to CreateListingForm but provides no onSuccess redirect. After a listing is successfully published the form has no callback to navigate the user. The CreateListingForm component itself (line 65) calls onPublish(listing.id) but sell.tsx never wires a redirect; the user is left on the create form with no feedback and no path forward.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/marketplace/sell.tsx`

- Lines: 13-22


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** In sell.tsx, wrap publishListing to also call router.push(`/marketplace/${id}`) on success. Display a toast confirmation.

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
