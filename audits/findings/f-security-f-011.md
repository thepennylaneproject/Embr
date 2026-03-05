# Finding: f-security-f-011

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Notifications module uses hardcoded 'dev-secret' as JWT fallback

## Description

JwtModule.register({ secret: process.env.JWT_SECRET || 'dev-secret' }) uses the literal string 'dev-secret' if JWT_SECRET is not set. Any JWT signed with this well-known fallback is accepted as valid by the notifications module. The main auth module fails hard if JWT_SECRET is missing — this module silently falls back.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/notifications/notifications.module.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Replace the || 'dev-secret' fallback with: const secret = configService.get<string>('JWT_SECRET'); if (!secret) throw new Error('JWT_SECRET is required'). Inject ConfigService into the module. Alternatively, extract JwtModule configuration into a shared auth module used by all modules that need JWT validation.

**Affected files:** `apps/api/src/core/notifications/notifications.module.ts`

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
