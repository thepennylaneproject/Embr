# Finding: f-deploy-env-validation-startup-001

> **Status:** fixed_verified | **Severity:** major | **Priority:** P1 | **Type:** enhancement | **Confidence:** inference

## Title

Environment variables are not validated at startup; missing or invalid vars could cause runtime crashes hours after boot

## Description

Environment variables are not validated at startup; missing or invalid vars could cause runtime crashes hours after boot

## Impact

Audit carry-forward item; impact is described by the finding title and source case file.

## Suggested fix

Review the existing case file and apply the documented remediation.

**Affected files:** —

## Proof hooks

- **[code_ref]** AppModule loads ConfigModule with envValidationSchema and abortEarly=false.
  - File: `apps/api/src/app.module.ts`
- **[config_key]** env.validation.ts requires DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET and validates production URLs/cookies.
  - File: `apps/api/src/config/env.validation.ts`

## History

- 2026-03-16T22:46:47Z — **linear-sync** — note_added: Status synced from Linear (PLP-87): Todo -> accepted
- 2026-03-17T19:52:54Z — **linear-sync** — note_added: Status synced from Linear (PLP-87): In Review -> fixed_pending_verify
- 2026-03-17T22:57:41Z — **linear-sync** — note_added: Status synced from Linear (PLP-87): In Progress -> in_progress
- 2026-03-17T23:01:40Z — **linear-sync** — note_added: Status synced from Linear (PLP-87): In Review -> fixed_pending_verify
- 2026-04-27T22:39:21Z — **synthesizer** — verification_passed: Marked fixed_verified based on this audit pass evidence.
- 2026-04-27T22:41:34Z — **ingest_synthesizer** — status_change: Status changed by synthesizer synthesized-20260427-223921 [fixed_pending_verify → fixed_verified]

---
*Last canonical synthesizer run: `synthesized-20260427-223921`*
