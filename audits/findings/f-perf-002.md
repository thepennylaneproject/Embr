# Finding: f-perf-002

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Unread total endpoint fans out count query for every conversation

## Description

Unread totals are computed by loading all conversation IDs then invoking `getUnreadCountForConversation` for each conversation.

## Proof Hooks

### [code_ref] Conversation IDs loaded then per-ID unread count

- File: `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts`

- Symbol: `getUnreadCount`

- Lines: 876-915

### [data_shape] Expected single grouped query vs observed N fan-out

- Expected: Single grouped count query keyed by conversationId

- Actual: 1 query for conversations + N count queries


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Hot endpoint can become expensive for power users and drives unnecessary DB CPU.


## Suggested Fix

**Approach:** Use one grouped count query with filters (`senderId != userId`, `status != READ`) and aggregate totals from grouped result.

**Affected files:** `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts`

**Effort:** small

**Risk:** Low risk.


## Tests Needed

- [ ] Unit test comparing grouped totals to previous per-conversation logic


## Related Findings

- `f-perf-001`


## Timeline

- 2026-03-05T19:44:51.494026Z | performance-cost-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
