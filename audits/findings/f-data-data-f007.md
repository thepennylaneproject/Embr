# Finding: f-data-data-f007

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Comment soft-delete cascade deletes one level but decrements full descendant count

## Description

Service recursively counts descendants but updateMany only soft-deletes root + direct replies.

## Proof Hooks

### [code_ref] countDescendants recursive; delete query only includes { id } and { parentId: commentId }

- File: `apps/api/src/verticals/feeds/content/services/comments.service.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Orphaned deeper replies and denormalized Post.commentCount drift.


## Suggested Fix

**Approach:** Delete/update full subtree within a transaction (recursive CTE SQL or iterative traversal) and recompute count safely.

**Affected files:** _none specified_

**Effort:** medium

**Risk:** 


## Tests Needed

- [ ] Add targeted verification tests/checks


## Related Findings

_(none)_


## Timeline

- 2026-03-05T19:44:51.494026Z | schema-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
