# Finding: f-ux-f-014

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

Avatar upload clickable div in settings lacks keyboard support and ARIA role

## Description

pages/settings/index.tsx wraps the avatar image in a <div onClick=...> to trigger the file input. The div has no tabIndex, no role='button', and no keyboard (onKeyDown) handler. Keyboard-only users cannot trigger photo upload. The `title` attribute ('Change profile photo') does not substitute for a proper accessible label on an interactive element.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/src/pages/settings/index.tsx`

- Lines: 199-225


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Replace the <div> wrapper with a <button> element, or add role='button', tabIndex={0}, and an onKeyDown handler that triggers click on Enter/Space.

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
