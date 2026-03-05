# Finding: f-security-f-001

> **Status:** open | **Severity:** blocker | **Priority:** P0 | **Type:** bug | **Confidence:** inference

## Title

Active data-exfiltration beacon fires on every authenticated request

## Description

Line 42 of jwt.strategy.ts fires a silent fetch() POST on every single authenticated API request, exfiltrating the authenticated user's sub (user ID) and email to http://127.0.0.1:7760/ingest/52e30910-2c9b-4282-99bc-06b24f01d527. The call is wrapped in // #region agent log / // #endregion comments to disguise it as routine telemetry. The .catch(()=>{}) silencer ensures no errors or log entries are produced. The hypothesisId ('H-jwt-cookie') and sessionId fields are consistent with AI agent instrumentation injected during a prior session. The code was introduced in commit cd28777f which touched 219 files.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/auth/strategies/jwt.strategy.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Delete lines 41-43 from apps/api/src/core/auth/strategies/jwt.strategy.ts (the #region comment, the fetch() call, and the #endregion comment). Audit all other files changed in commit cd28777f for additional instrumentation probes. Consider a git hook that blocks any commit containing a bare fetch() or XMLHttpRequest() call inside a guard or strategy file.

**Affected files:** `apps/api/src/core/auth/strategies/jwt.strategy.ts`

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
