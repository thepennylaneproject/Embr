# Finding: f-data-data-f001

> **Status:** open | **Severity:** blocker | **Priority:** P0 | **Type:** bug | **Confidence:** evidence

## Title

Prisma schema contains many models absent from migration history

## Description

Current Prisma schema declares Group/MutualAid/Marketplace/Event/Organizing models, but migration SQL history never creates those tables/enums. Databases built from migrations will not match runtime Prisma client expectations.

## Proof Hooks

### [code_ref] Models exist: Group, MarketplaceListing, Event, Poll, GroupTreasury and related entities

- File: `apps/api/prisma/schema.prisma`

### [code_ref] No CREATE TABLE for Group/Marketplace/Event/Poll/GroupTreasury families

- File: `apps/api/prisma/migrations//migration.sql`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Runtime query failures and deploy-time schema drift across environments; high risk of production breakage when code touches missing tables.


## Suggested Fix

**Approach:** Create reconciliation migrations for all missing models/enums and verify with prisma migrate status on a clean DB and an existing DB snapshot.

**Affected files:** `apps/api/prisma/migrations//migration.sql` `apps/api/prisma/schema.prisma`

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
