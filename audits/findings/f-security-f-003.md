# Finding: f-security-f-003

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

No-op authentication middleware unconditionally calls next()

## Description

apps/api/src/middleware/auth.ts exports requireAuth as (req, res, next) => next() — a complete pass-through providing zero authentication. If this middleware is registered via configure() in any NestJS module or app.use() in main.ts, routes covered by it receive no authentication enforcement regardless of the global JwtAuthGuard.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/middleware/auth.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Remove apps/api/src/middleware/auth.ts entirely. Rely exclusively on JwtAuthGuard (global APP_GUARD) and per-route @UseGuards() decorators. For public routes, use the @Public() decorator.

**Affected files:** `apps/api/src/middleware/auth.ts`

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
