# Finding: f-schema-validation-amount-001

> **Status:** fixed_verified | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Monetary amount fields (Wallet, Transaction, Tip, Payout) lack NOT NULL or CHECK constraints in schema

## Description

Monetary amount fields (Wallet, Transaction, Tip, Payout) lack NOT NULL or CHECK constraints in schema

## Impact

Audit carry-forward item; impact is described by the finding title and source case file.

## Suggested fix

Review the existing case file and apply the documented remediation.

**Affected files:** —

## Proof hooks

- **[query]** Wallet, Transaction, Tip, and Payout amount fields now have positive/non-negative CHECK constraints.
  - File: `apps/api/prisma/migrations/20260317000000_add_monetary_amount_check_constraints/migration.sql`

## History

- 2026-03-16T22:46:47Z — **linear-sync** — note_added: Status synced from Linear (PLP-79): Todo -> accepted
- 2026-03-17T19:52:54Z — **linear-sync** — note_added: Status synced from Linear (PLP-79): In Review -> fixed_pending_verify
- 2026-03-17T22:57:41Z — **linear-sync** — note_added: Status synced from Linear (PLP-79): In Progress -> in_progress
- 2026-03-17T23:01:40Z — **linear-sync** — note_added: Status synced from Linear (PLP-79): In Review -> fixed_pending_verify
- 2026-04-27T22:39:21Z — **synthesizer** — verification_passed: Marked fixed_verified based on this audit pass evidence.
- 2026-04-27T22:41:34Z — **ingest_synthesizer** — status_change: Status changed by synthesizer synthesized-20260427-223921 [fixed_pending_verify → fixed_verified]

---
*Last canonical synthesizer run: `synthesized-20260427-223921`*
