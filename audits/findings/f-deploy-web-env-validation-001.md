# Finding: f-deploy-web-env-validation-001

> **Status:** fixed_verified | **Severity:** minor | **Priority:** P2 | **Type:** enhancement | **Confidence:** inference

## Title

Next.js web app does not validate required NEXT_PUBLIC_API_URL at build time

## Description

Next.js web app does not validate required NEXT_PUBLIC_API_URL at build time

## Impact

Audit carry-forward item; impact is described by the finding title and source case file.

## Suggested fix

Review the existing case file and apply the documented remediation.

**Affected files:** —

## Proof hooks

- **[code_ref]** Web next.config.js validates NEXT_PUBLIC_API_URL at build/start and throws on missing/invalid values.
  - File: `apps/web/next.config.js`

## History

- 2026-03-19T22:47:21Z — **linear-sync** — note_added: Status synced from Linear (PLP-88): Todo -> accepted
- 2026-04-27T22:39:21Z — **synthesizer** — verification_passed: Marked fixed_verified based on this audit pass evidence.
- 2026-04-27T22:41:34Z — **ingest_synthesizer** — status_change: Status changed by synthesizer synthesized-20260427-223921 [accepted → fixed_verified]

---
*Last canonical synthesizer run: `synthesized-20260427-223921`*
