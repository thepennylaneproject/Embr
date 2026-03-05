# Finding: f-security-f-012

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Auth tokens returned in JSON response body for changePassword and verifyEmail

## Description

changePassword() and verifyEmail() in auth.service.ts return a TokenResponse containing accessToken and refreshToken in the JSON body. The web client type annotations confirm this — Promise<{ user: User; accessToken: string; refreshToken: string }>. A comment acknowledges this is intentional 'for backward compatibility'. Tokens in the response body are accessible to JavaScript (unlike httpOnly cookies) and can be read by any XSS payload present on the page at the time these operations complete.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/auth/auth.service.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Remove accessToken and refreshToken from the JSON body of changePassword and verifyEmail responses. Set them exclusively via httpOnly cookies, consistent with the login endpoint. Update the web client response type annotations to remove token fields.

**Affected files:** `apps/api/src/core/auth/auth.service.ts` `apps/web/src/lib/api/auth.ts`

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
