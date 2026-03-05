# Finding: f-security-f-014

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

resetPassword and verifyEmail scan all active tokens globally without user filter

## Description

resetPassword() fetches the last 100 non-expired non-used PasswordResetTokens with no userId filter, then iterates them all with bcrypt.compare. An attacker triggering many reset requests from multiple IPs can fill the 100-token window, pushing legitimate tokens out. The same pattern exists in verifyEmail(). The architecture also violates isolation: a valid token for user A is compared against every reset attempt in the window.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/auth/auth.service.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Add userId to both query filters: where: { userId: targetUserId, isUsed: false, expiresAt: { gt: new Date() } }. For resetPassword, encode userId in the reset token (e.g., as a JWT sub claim or prepended in the token value) so the userId is recoverable without an extra email parameter.

**Affected files:** `apps/api/src/core/auth/auth.service.ts`

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
