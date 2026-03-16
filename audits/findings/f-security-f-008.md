# Finding: f-security-f-008

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Any authenticated user can self-assign creator role via PATCH /users/settings

## Description

UpdateUserSettingsDto exposes an @IsOptional() @IsBoolean() isCreator field with no role-based access control. Any user with role USER can call PATCH /api/users/settings with { "isCreator": true } and immediately gain creator access to monetization features without any approval workflow.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/users/dto/update-user-settings.dto.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Remove isCreator from UpdateUserSettingsDto. Creator status must be granted only via an admin-controlled endpoint: POST /api/admin/users/:id/grant-creator protected by @Roles('ADMIN').

**Affected files:** `apps/api/src/core/users/dto/update-user-settings.dto.ts` `apps/api/src/core/users/users.service.ts`

**Effort:** small

**Risk:** 


## Tests Needed

- [ ] Add targeted verification tests/checks


## Related Findings

_(none)_


## Timeline

- 2026-03-05T19:44:51.494026Z | security-privacy-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
