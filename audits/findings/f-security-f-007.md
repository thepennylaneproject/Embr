# Finding: f-security-f-007

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Full wallet and financial data returned in all user profile responses

## Description

sanitizeUser() removes only passwordHash and googleId. All wallet relation data — balance, pendingBalance, totalEarned, totalWithdrawn, stripeConnectAccountId, kycStatus — is included in every response that embeds a user object. This affects /api/auth/me, /api/users/:username, profile pages, and all auth flow responses.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/auth/auth.service.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Define separate response shapes: PublicProfileResponse (display name, avatar, bio, social links, follower counts), PrivateUserResponse (adds email and verification status for the account owner), and OwnerFinancialResponse (adds wallet data, visible only to the owner and admins). Apply the appropriate type by comparing the requester's ID against the profile owner's ID. Never include stripeConnectAccountId or kycStatus in non-owner, non-admin responses.

**Affected files:** `apps/api/src/core/auth/auth.service.ts` `apps/api/src/core/users/users.service.ts`

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
