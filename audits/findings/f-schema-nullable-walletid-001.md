# Finding: f-schema-nullable-walletid-001

> **Status:** fixed_verified | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Transaction and Payout tables have walletId foreign key field but schema marks as nullable

## Description

Transaction and Payout tables have walletId foreign key field but schema marks as nullable

## Impact

Audit carry-forward item; impact is described by the finding title and source case file.

## Suggested fix

Review the existing case file and apply the documented remediation.

**Affected files:** —

## Proof hooks

- **[data_shape]** Prisma schema now declares Transaction.walletId and Payout.walletId as required String fields.
  - File: `apps/api/prisma/schema.prisma`
- **[query]** Migration backfills unresolved rows and ALTERs both columns SET NOT NULL.
  - File: `apps/api/prisma/migrations/20260317000000_enforce_walletid_not_null/migration.sql`

## History

- 2026-03-16T22:46:47Z — **linear-sync** — note_added: Status synced from Linear (PLP-75): Todo -> accepted
- 2026-03-17T19:52:54Z — **linear-sync** — note_added: Status synced from Linear (PLP-75): In Review -> fixed_pending_verify
- 2026-03-17T22:57:41Z — **linear-sync** — note_added: Status synced from Linear (PLP-75): In Progress -> in_progress
- 2026-03-17T23:01:40Z — **linear-sync** — note_added: Status synced from Linear (PLP-75): In Review -> fixed_pending_verify
- 2026-04-27T22:39:21Z — **synthesizer** — verification_passed: Marked fixed_verified based on this audit pass evidence.
- 2026-04-27T22:41:34Z — **ingest_synthesizer** — status_change: Status changed by synthesizer synthesized-20260427-223921 [fixed_pending_verify → fixed_verified]

---
*Last canonical synthesizer run: `synthesized-20260427-223921`*
