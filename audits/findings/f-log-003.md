# Finding: f-log-003

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Unsafe profile access in follows.service.ts without existence check

## Description

The target user existence check exists, but followUser still calls tx.profile.update for both users inside the transaction. If either Profile row is absent, Prisma can still throw before the later updateMany fallback runs. The later updateMany block also duplicates the counter increments when profiles do exist.

## Impact

Follow creation can still fail for users without Profile rows, and successful follows can inflate profile counters by two instead of one.

## Suggested fix

Review the existing case file and apply the documented remediation.

**Affected files:** —

## Proof hooks

- **[code_ref]** The transaction uses tx.profile.update for follower and following profiles, which requires both Profile rows to exist.
  - File: `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts`
- **[code_ref]** A second updateMany block increments the same counters again after the transaction, so the attempted fallback creates counter drift.
  - File: `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts`

## History

- 2026-03-16T22:46:47Z — **linear-sync** — note_added: Status synced from Linear (PLP-97): Todo -> accepted
- 2026-03-17T19:52:54Z — **linear-sync** — note_added: Status synced from Linear (PLP-97): In Review -> fixed_pending_verify
- 2026-03-17T22:57:41Z — **linear-sync** — note_added: Status synced from Linear (PLP-97): In Progress -> in_progress
- 2026-03-17T23:01:40Z — **linear-sync** — note_added: Status synced from Linear (PLP-97): In Review -> fixed_pending_verify
- 2026-04-27T22:39:21Z — **synthesizer** — verification_failed: Fix remains incomplete: profile update path can still fail and now duplicates counter increments.
- 2026-04-28T01:17:00Z — **synthesizer** — verification_failed: Verification failed: profile updates are still unsafe for missing Profile rows and now duplicate counter increments.
- 2026-04-28T01:19:13Z — **ingest_synthesizer** — status_change: Status changed by synthesizer synthesized-20260427-223921 [fixed_pending_verify → open]

---
*Last canonical synthesizer run: `synthesized-20260427-223921`*
