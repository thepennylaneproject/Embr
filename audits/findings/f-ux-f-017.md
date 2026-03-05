# Finding: f-ux-f-017

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

profile/index.tsx mixes Tailwind class `text-gray-600` with the CSS variable design system

## Description

pages/profile/index.tsx line 51 uses className='text-gray-600' for the loading state paragraph. The entire codebase otherwise uses CSS custom properties (var(--embr-muted-text), var(--embr-error), etc.) defined via the design token system. This creates a maintenance hazard where profile loading text will not respond to theme changes or dark mode if implemented.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/profile/index.tsx`

- Lines: 51-51


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Replace className='text-gray-600' with style={{ color: 'var(--embr-muted-text)' }} to align with the CSS variable token system.

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
