# Finding: f-perf-011

> **Status:** open | **Severity:** major | **Priority:** P2 | **Type:** enhancement | **Confidence:** inference

## Title

Group listing sorts by memberCount without explicit schema index

## Description

Groups query orders by `memberCount desc`; schema indexes `Group.slug/type/category/createdAt/deletedAt` but not `memberCount`.

## Proof Hooks

### [code_ref] Order by memberCount in group discovery query

- File: `apps/api/src/verticals/groups/services/groups.service.ts`

- Symbol: `findAll`

- Lines: 67-70

### [code_ref] No Group.memberCount index in Prisma model

- File: `apps/api/prisma/schema.prisma`

- Symbol: `model Group`

- Lines: 1479-1515


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Potential sort cost/full scan as group table grows.


## Suggested Fix

**Approach:** Add index on `memberCount` (possibly composite with `deletedAt` / `type` depending on query cardinality).

**Affected files:** `apps/api/prisma/schema.prisma`

**Effort:** small

**Risk:** Index write overhead; validate with EXPLAIN ANALYZE first.


## Tests Needed

- [ ] Query plan comparison before/after index


## Related Findings

- `f-perf-012`


## Timeline

- 2026-03-05T19:44:51.494026Z | performance-cost-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
