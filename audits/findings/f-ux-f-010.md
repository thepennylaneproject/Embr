# Finding: f-ux-f-010

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

FeaturePlaceholder component leaks developer issue IDs in user-visible text

## Description

FeaturePlaceholder renders descriptions like 'No {title} data yet. TODO: {issueId}' and '{title} data is loading. TODO: {issueId}'. The issueId prop is an internal ticket reference. Any page that uses FeaturePlaceholder renders raw TODO strings to end users. This is developer scaffolding that has leaked into the production UI.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/components/layout/FeaturePlaceholder.tsx`

- Lines: 28-28


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Remove 'TODO: ${issueId}' from user-visible description strings. Keep the issueId as an HTML data attribute or in a code comment only. Replace with a helpful empty-state message guiding the user on what to do next.

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
