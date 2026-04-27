# Finding: f-log-003

> **Status:** fixed_pending_verify | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Unsafe profile access in follows.service.ts without existence check

## Description

Follow user existence is checked, but the profile counter update path still calls tx.profile.update inside the transaction and then updateMany after the transaction. Missing profiles can still throw before the updateMany fallback, and the duplicate block creates counter drift.

## Impact

Audit carry-forward item; impact is described by the finding title and source case file.

## Suggested fix

Review the existing case file and apply the documented remediation.

**Affected files:** —

## Proof hooks

- **[code_ref]** Target user existence is checked, but profile update still uses tx.profile.update inside the transaction.
  - File: `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts`
- **[code_ref]** Post-transaction updateMany is present after the transaction, creating duplicate counter mutation.
  - File: `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts`

## History

- 2026-03-16T22:46:47Z — **linear-sync** — note_added: Status synced from Linear (PLP-97): Todo -> accepted
- 2026-03-17T19:52:54Z — **linear-sync** — note_added: Status synced from Linear (PLP-97): In Review -> fixed_pending_verify
- 2026-03-17T22:57:41Z — **linear-sync** — note_added: Status synced from Linear (PLP-97): In Progress -> in_progress
- 2026-03-17T23:01:40Z — **linear-sync** — note_added: Status synced from Linear (PLP-97): In Review -> fixed_pending_verify
- 2026-04-27T22:39:21Z — **synthesizer** — verification_failed: Fix remains incomplete: profile update path can still fail and now duplicates counter increments.

---
*Last canonical synthesizer run: `synthesized-20260427-223921`*
