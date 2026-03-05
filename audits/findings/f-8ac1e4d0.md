# Finding: f-8ac1e4d0

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Messaging getMessages pagination ignores page/skip

## Description

getMessages computes skip from page and limit but never passes skip to Prisma findMany. API returns first page repeatedly, while metadata suggests paging is active.

## Proof Hooks

### [code_ref] skip computed but not used

- File: `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts`

- Symbol: `getMessages`

- Lines: 535-591


## Reproduction Steps

1. Create a conversation with > 100 messages.

2. Request page=1 limit=50, then page=2 limit=50 via messaging API.

3. Observe overlapping/identical messages due to missing offset.


## Impact

Pagination is logically broken, causing duplicate results and incorrect client navigation.


## Suggested Fix

**Approach:** Pass skip into findMany for page-based mode and reconcile with cursor params (before/after) to avoid mixed semantics.

**Affected files:** `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts`

**Effort:** small

**Risk:** Medium; requires clear precedence between page and before/after modes.


## Tests Needed

- [ ] Integration test: page 1 and page 2 return non-overlapping windows.

- [ ] Integration test: totalPages and hasMore align with paged results.


## Related Findings

- `f-2e4f71b3`


## Timeline

- 2026-03-05T13:26:27Z | runtime-bug-hunter | created | Direct logic defect in pagination implementation.


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
