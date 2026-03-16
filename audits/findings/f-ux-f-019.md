# Finding: f-ux-f-019

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** question | **Confidence:** inference

## Title

Product voice is undefined — formal and casual tones coexist without a standard

## Description

No voice guide or copy standard exists in the codebase. Observable tone mismatches: login page is formal ('Continue building with Embr.'), signup is aspirational ('Build your creator space on Embr.'), discovery page is casual ('Find amazing creators and connect with the community'), about page is activist/confrontational ('Spotify takes 70%...Your audience isn't yours.'), settings subtitle is informational ('Manage your account, privacy, and notification preferences.'). Button casing is also mixed: 'Save changes' (sentence case) vs 'View Profile' / 'Edit Profile' / 'Sign Out' (Title Case) in the same dropdown.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/auth/login.tsx`

- Lines: 39-39


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Formalise the voice guide in style-scope-voice.md (file already exists) and reference it from AGENTS.md. Define: (a) default tone register, (b) button casing standard (recommend sentence case throughout), (c) error message format, (d) empty-state format. Apply across all pages.

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
