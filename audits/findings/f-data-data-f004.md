# Finding: f-data-data-f004

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

DTO/service still write dropped Profile columns

## Description

emailNotifications and pushNotifications were dropped from schema, but user settings DTO and service still accept/pass them into prisma.profile.update.

## Proof Hooks

### [code_ref] DTO includes emailNotifications and pushNotifications

- File: `apps/api/src/core/users/dto/update-user-settings.dto.ts`

### [code_ref] passes updateSettingsDto directly to prisma.profile.update

- File: `apps/api/src/core/users/users.service.ts`

### [code_ref] DROP COLUMN emailNotifications, pushNotifications from Profile

- File: `apps/api/prisma/migrations/20260207042211_init/migration.sql`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Runtime write errors and failed settings updates.


## Suggested Fix

**Approach:** Remove obsolete DTO fields and map only schema-valid fields in service.

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
