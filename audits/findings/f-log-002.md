# Finding: f-log-002

> **Status:** fixed_verified | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Potential null dereference in conversation deletion without soft-delete

## Description

Conversation deletion now checks that the conversation exists and is not already soft-deleted before accessing participant fields, then soft-deletes by setting deletedAt and maps Prisma P2025 races to NotFoundException.

## Impact

The delete path no longer dereferences a missing conversation and no longer hard-deletes the row; concurrent delete races return a controlled not-found response.

## Suggested fix

Review the existing case file and apply the documented remediation.

**Affected files:** —

## Proof hooks

- **[code_ref]** deleteConversation fetches the conversation, throws NotFoundException when missing/deleted, validates participant membership, and updates deletedAt instead of deleting the row.
  - File: `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts`
- **[code_ref]** The update is wrapped in a try/catch that converts Prisma P2025 into NotFoundException for concurrent missing/already-deleted rows.
  - File: `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts`

## History

- 2026-03-16T22:46:47Z — **linear-sync** — note_added: Status synced from Linear (PLP-96): Todo -> accepted
- 2026-03-17T19:52:54Z — **linear-sync** — note_added: Status synced from Linear (PLP-96): In Review -> fixed_pending_verify
- 2026-03-17T22:57:41Z — **linear-sync** — note_added: Status synced from Linear (PLP-96): In Progress -> in_progress
- 2026-03-17T23:01:40Z — **linear-sync** — note_added: Status synced from Linear (PLP-96): In Review -> fixed_pending_verify
- 2026-04-28T01:17:00Z — **synthesizer** — verification_passed: Verified by source review: deleteConversation uses soft-delete and guards missing/deleted conversations before participant access.
- 2026-04-28T01:19:13Z — **ingest_synthesizer** — status_change: Status changed by synthesizer synthesized-20260427-223921 [fixed_pending_verify → fixed_verified]

---
*Last canonical synthesizer run: `synthesized-20260427-223921`*
