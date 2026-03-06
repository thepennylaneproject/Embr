# Finding: f-ux-f-018

> **Status:** in_progress | **Severity:** minor | **Priority:** P3 | **Type:** bug | **Confidence:** inference

## Title

DiscoveryPage.tsx uses hardcoded hex colors and Tailwind — isolated from design token system

## Description

DiscoveryPage.tsx uses hardcoded hex colors (#F4F1F1, #E8998D) and Tailwind utility classes (bg-[#F4F1F1], text-[#E8998D]) directly, while all other pages use CSS variables (var(--embr-warm-1), var(--embr-accent)) from the design token system. Also, DiscoveryPage uses Tailwind's responsive grid classes (lg:col-span-2) while the rest of the app uses inline styles for layout.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/DiscoveryPage.tsx`

- Lines: 22-25


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Replace hardcoded hex values with CSS custom properties (var(--embr-accent), var(--embr-bg)). Align layout approach with the rest of the app. This also bundles with F-004 (the page being unreachable).

**Affected files:** _none specified_

**Effort:** small

**Risk:** 


## Tests Needed

- [ ] Add targeted verification tests/checks


## Related Findings

_(none)_


## Timeline

- 2026-03-05T19:44:51.494026Z | ux-flow-auditor | created | Imported from agent output during synthesis
- 2026-03-06T06:20:09Z | ux-flow-auditor | in_progress | Partial fix: page wrapper uses CSS variables. Sub-components still use Tailwind hardcoded colors.
- 2026-03-06T18:39:01Z | ux-flow-auditor | updated | Changes: priority: P2 -> P3


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
