# Finding: f-ux-f-005

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

No `<title>` element set on any page — screen readers announce no page name

## Description

_app.tsx sets a viewport meta but no <title>. No individual page sets <Head><title>...</title></Head>. Screen reader users navigating between pages receive no page-change announcement. Tab titles remain blank or show the URL, causing disorientation. This also means zero SEO title coverage.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/_app.tsx`

- Lines: 11-13


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Add next/head with a descriptive <title> to each page (e.g. 'Feed — Embr', 'Sign In — Embr'). Consider a shared helper that appends the app name.

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
