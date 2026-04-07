# Finding: f-ece9392a

> **Status:** resolved | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Disabled auth assigns one shared dev user to every request

## Description

When `AUTH_ENABLED` is false the authentication middleware does not validate JWTs
and does not set a per-request user identity.  Any fallback that returns a fixed
`LOCAL_DEV_USER_ID` for all callers causes every client to share the same logical
identity — defeating all access-control, ownership, and audit-log guarantees.

The bug is a latent risk rather than currently active code (the NestJS API uses
`JwtAuthGuard` which always validates tokens), but the absence of an explicit
guard means the configuration could silently regress.

## Proof Hooks

### [code_ref] No AUTH_ENABLED guard on JWT strategy or bootstrap

- File: `apps/api/src/core/auth/guards/jwt-auth.guard.ts`
- Symbol: `JwtAuthGuard.canActivate`

No check prevented `AUTH_ENABLED=false` from silently bypassing JWT validation.

### [code_ref] No startup fail-fast for production misconfiguration

- File: `apps/api/src/main.ts`
- Symbol: `bootstrap`

The server would start and serve traffic even with `AUTH_ENABLED=false` in
production without any error or warning.

## Reproduction Steps

1. Set `AUTH_ENABLED=false` and `NODE_ENV=production` in the API environment.
2. Start the API — previously it would start without error.
3. With the fix applied, the process exits with code 1 and a fatal error message.

## Impact

In any environment where `AUTH_ENABLED=false` is used (or accidentally left set)
while the service is internet-reachable:

- Every authenticated endpoint is accessible without credentials.
- All authorization decisions that rely on `req.user` evaluate against a shared
  identity, granting one user's permissions to every caller.
- Audit logs record the wrong actor for every action.

## Suggested Fix

**Approach:**
1. Add `AUTH_ENABLED` / `AUTH_ALLOW_LOCAL_BYPASS` / `AUTH_BYPASS_SECRET` to the
   Joi validation schema in `env.validation.ts`.  `AUTH_ENABLED` is validated as
   required-`true` in `NODE_ENV=production`.
2. Add `assertAuthConfigSafe()` (extracted to `src/config/auth-config.util.ts`)
   and call it before the HTTP server binds in `bootstrap()`.  The function
   exits with code 1 if `AUTH_ENABLED=false` in production, or if the bypass
   secret is too short.
3. Update `JwtAuthGuard.canActivate` to reject requests when `AUTH_ENABLED=false`
   but the `X-Dev-Bypass-Secret` header is missing or incorrect.  This prevents
   silent wide-open access even in local dev when auth is disabled.

**Affected files:**
- `apps/api/src/config/env.validation.ts`
- `apps/api/src/config/auth-config.util.ts` _(new)_
- `apps/api/src/main.ts`
- `apps/api/src/core/auth/guards/jwt-auth.guard.ts`

**Effort:** small

**Risk:** Low — changes are additive guards only.  Existing JWT validation is
unchanged; the new code only fires when `AUTH_ENABLED=false`.

## Tests Needed

- [x] Unit test: `NODE_ENV=production` + `AUTH_ENABLED=false` calls exitFn(1).
- [x] Unit test: `NODE_ENV=production` + `AUTH_ENABLED=true` passes cleanly.
- [x] Unit test: `AUTH_ALLOW_LOCAL_BYPASS=true` with short secret calls exitFn(1).
- [x] Unit test: dev + `AUTH_ENABLED=false` emits warning, does NOT exit.

Test file: `apps/api/src/config/__tests__/auth-config.util.spec.ts`

## Related Findings

| ID | Relationship |
|----|-------------|
| sec-003 | Same theme — missing production-only guard on security-critical config |
| inv-001 | Auth bypass via Next.js middleware — related auth bypass surface |

## Timeline

| Date | Actor | Event | Notes |
|------|-------|-------|-------|
| 2026-04-07 | LYRA audit suite | created | Finding ID `f-ece9392a` synced from Linear PLP-561 |
| 2026-04-07 | cursor-agent | resolved | Implemented fail-fast guard, bypass header validation, unit tests |

## Artifacts

_(none)_

## Enhancement Notes

Document in `AGENTS.md` or a `docs/auth-bypass.md` that local stacks using
`AUTH_ENABLED=false` must also set `AUTH_ALLOW_LOCAL_BYPASS=true` and a strong
`AUTH_BYPASS_SECRET`, and must not be reachable from the internet.

## Decision Log (for type: question)

- **Decision:** N/A — this is a bug fix, not a question.
- **Decided by:** N/A
- **Date:** N/A
- **Reasoning:** N/A
