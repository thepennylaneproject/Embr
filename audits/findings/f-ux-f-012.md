# Finding: f-ux-f-012

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

'Sign in' vs 'Sign Out' — inconsistent capitalisation for the same auth concept

## Description

The login page button, its loading state, and the page title all use 'Sign in' (sentence case, lowercase i). The AppShell user dropdown uses 'Sign Out' (Title Case, capital O). The signup page uses 'Create account' (sentence case). The homepage uses 'Sign in' and 'Create account'. This mixed casing signals lack of a copywriting standard.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/auth/login.tsx:68-70 (Sign in / Signing in...)`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Standardise on sentence case throughout: 'Sign in' and 'Sign out'. Update AppShell dropdown accordingly. Audit all other action labels for consistency.

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
