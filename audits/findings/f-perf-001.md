# Finding: f-perf-001

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Conversation list computes unread counts with per-conversation count queries

## Description

Conversation retrieval issues one base query then executes one `message.count` per conversation in a map. This creates an N+1 pattern and scales linearly with page size.

## Proof Hooks

### [code_ref] Per-conversation unread count query inside map

- File: `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts`

- Symbol: `getConversations`

- Lines: 128-141

### [data_shape] Expected batched group count vs observed fan-out counts

- Expected: 1 query to fetch conversations + 1 grouped unread aggregation

- Actual: 1 query to fetch conversations + N individual `message.count` calls


## Reproduction Steps

1. Seed user with 100+ conversations

2. Call GET conversations endpoint with limit=20

3. Observe query count rising with limit


## Impact

Higher DB round-trips and tail latency on inbox load; cost scales with active conversation count.


## Suggested Fix

**Approach:** Replace per-row counts with grouped aggregation using `groupBy` on `conversationId` (or raw SQL CTE) and merge in memory.

**Affected files:** `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts`

**Effort:** small

**Risk:** Low risk; response shape unchanged if merged carefully.


## Tests Needed

- [ ] Performance regression test for query count at limit=20/50

- [ ] Functional test ensuring unread counts match previous behavior


## Related Findings

- `f-perf-002`


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
