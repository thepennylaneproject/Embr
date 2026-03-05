# Finding: f-data-data-f005

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Safety DTO enums are lowercase while Prisma enums are uppercase

## Description

Safety DTOs validate lowercase enum values (e.g., spam, pending) and services cast directly to Prisma enum types without normalization.

## Proof Hooks

### [code_ref] ReportReason/ReportStatus/ActionType/AppealStatus lowercase values

- File: `apps/api/src/core/safety/dto/safety.dto.ts`

### [code_ref] casts dto values as unknown as Prisma* during writes

- File: `apps/api/src/core/safety/services/reports.service.ts`

### [code_ref] Prisma enums are uppercase variants

- File: `apps/api/prisma/schema.prisma`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Requests can pass DTO validation yet fail at persistence.


## Suggested Fix

**Approach:** Unify DTO enums with Prisma enum values or normalize before DB writes; remove unsafe enum casts.

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
