# Finding: f-security-f-002

> **Status:** open | **Severity:** blocker | **Priority:** P0 | **Type:** bug | **Confidence:** inference

## Title

Roles guard case mismatch — all admin and moderator routes permanently return 403

## Description

Controllers apply @Roles('admin') and @Roles('moderator') using lowercase strings. The RolesGuard compares these against user.role from the database, which stores the Prisma UserRole enum values as uppercase: USER, CREATOR, MODERATOR, ADMIN. The comparison 'admin' === 'ADMIN' is always false. Every admin-gated route returns 403 for everyone including actual admins. Affected functionality includes payout approvals, moderation actions, user restriction management, and wallet admin operations.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/auth/guards/roles.guard.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Standardize all @Roles() decorator arguments to use uppercase values matching the Prisma enum: @Roles('ADMIN'), @Roles('MODERATOR'). Alternatively, normalize the comparison in RolesGuard: requiredRoles.includes(user.role?.toUpperCase()). Option A is preferred for explicitness. Add a unit test that fails if any @Roles() call uses lowercase strings.

**Affected files:** `apps/api/src/core/auth/guards/roles.guard.ts` `apps/api/src/core/safety/guards/roles.guard.ts` `apps/api/src/core/safety/controllers/safety.controller.ts` `apps/api/src/core/monetization/controllers/wallet.controller.ts`

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
