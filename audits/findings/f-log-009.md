# Finding: f-log-009

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** evidence

## Title

Unhandled promise rejection in useMessaging hook error callback

## Description

useMessaging still invokes onError and onErrorRef.current directly from socket handlers and catch blocks. Because async functions are assignable to a void callback type in React/TypeScript, a rejecting async onError callback can still produce an unhandled promise rejection.

## Impact

Consumer-provided async error handlers can still reject outside the hook control flow, causing noisy unhandled rejections and potentially bypassing user-facing error recovery.

## Suggested fix

Review the existing case file and apply the documented remediation.

**Affected files:** —

## Proof hooks

- **[code_ref]** UseMessagingOptions declares onError as a void callback, but async callbacks can still be passed by consumers.
  - File: `apps/web/src/hooks/useMessaging.ts`
- **[code_ref]** Socket error handlers and catch blocks call onError/onErrorRef.current without Promise.resolve(...).catch handling.
  - File: `apps/web/src/hooks/useMessaging.ts`

## History

- 2026-03-19T22:47:21Z — **linear-sync** — note_added: Status synced from Linear (PLP-103): In Review -> fixed_pending_verify
- 2026-04-28T01:17:00Z — **synthesizer** — verification_failed: Verification failed: error callbacks are still invoked without guarding returned promises.
- 2026-04-28T01:19:13Z — **ingest_synthesizer** — status_change: Status changed by synthesizer synthesized-20260427-223921 [fixed_pending_verify → open]

---
*Last canonical synthesizer run: `synthesized-20260427-223921`*
