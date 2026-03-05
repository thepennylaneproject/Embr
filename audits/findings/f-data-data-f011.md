# Finding: f-data-data-f011

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** question | **Confidence:** evidence

## Title

No RLS policies found; clarify whether app-layer auth is the intended sole control

## Description

No ENABLE ROW LEVEL SECURITY or CREATE POLICY statements were found in migrations; Prisma service uses unrestricted server-side client.

## Proof Hooks

### [code_ref] no RLS policy SQL found

- File: `apps/api/prisma/migrations//migration.sql`

### [code_ref] plain PrismaClient initialization (no per-request DB role scoping)

- File: `apps/api/src/core/database/prisma.service.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

If direct DB access paths are introduced later (BI tools, scripts, background jobs), row isolation is not enforced at DB layer.


## Suggested Fix

**Approach:** Human decision required: keep app-only authorization or add RLS for sensitive tables with explicit bypass strategy for trusted services.

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
