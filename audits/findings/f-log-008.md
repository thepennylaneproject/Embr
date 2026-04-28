# Finding: f-log-008

> **Status:** fixed_verified | **Severity:** major | **Priority:** P2 | **Type:** bug | **Confidence:** evidence

## Title

Unsafe property access in message sender mapping (messaging.service.ts:500)

## Description

The message sender mapping is backed by a Prisma create query that includes sender.profile, and the schema requires Message.senderId with a required sender relation. With that include shape, sender is materialized before the mapping reads sender.id, sender.username, and sender.profile.

## Impact

The reviewed sendMessage mapping has the sender relation included before response shaping, so the prior missing-include runtime access issue is resolved for this code path.

## Suggested fix

Review the existing case file and apply the documented remediation.

**Affected files:** —

## Proof hooks

- **[code_ref]** message.create includes sender with nested profile before messageWithSender is built.
  - File: `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts`
- **[data_shape]** Prisma schema declares Message.senderId as required and Message.sender as a required User relation with onDelete Cascade.
  - File: `apps/api/prisma/schema.prisma`

## History

- 2026-03-19T22:47:21Z — **linear-sync** — note_added: Status synced from Linear (PLP-102): In Review -> fixed_pending_verify
- 2026-04-28T01:17:00Z — **synthesizer** — verification_passed: Verified by source review: sender is included in the Prisma result and the schema relation is required.
- 2026-04-28T01:19:13Z — **ingest_synthesizer** — status_change: Status changed by synthesizer synthesized-20260427-223921 [fixed_pending_verify → fixed_verified]

---
*Last canonical synthesizer run: `synthesized-20260427-223921`*
