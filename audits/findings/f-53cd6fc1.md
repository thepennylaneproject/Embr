# Finding: f-53cd6fc1

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** debt | **Confidence:** evidence

## Title

next lint fails without NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL because next.config validates env at load

## Description

validateRequiredEnv in apps/web/next.config.js throws if required public env vars are absent.

## Impact

Lint/build blocked without exported vars.

## Suggested fix

See synthesizer / agent notes.

**Affected files:** —

## Proof hooks

- **[error_text]** Lint artifact shows validateRequiredEnv throwing.
- **[code_ref]** next.config throws when validation fails.
  - File: `apps/web/next.config.js`

## History

- 2026-04-29T20:15:00Z — **runtime-bug-hunter** — created: Cross-checked lint artifact with next.config validation block.
- 2026-04-29T21:45:30Z — **synthesizer** — note_added: Canonical env-validation debt superseding overlapping perf bundle blocker duplicate.

---
*Last canonical synthesizer run: `synthesized-20260429-214530`*
