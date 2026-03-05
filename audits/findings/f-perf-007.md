# Finding: f-perf-007

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** enhancement | **Confidence:** evidence

## Title

Messaging hook reconnect risk from unstable callback references

## Description

Caller passes inline callbacks to `useMessaging`; hook `connect` depends on those callbacks and auto-connect effect depends on `connect`, which can trigger reconnect churn on rerenders.

## Proof Hooks

### [code_ref] Inline callbacks in DMInbox options object

- File: `apps/web/src/components/messaging/DMInbox.tsx`

- Symbol: `DMInbox`

- Lines: 39-51

### [code_ref] connect useCallback and auto-connect effect dependency chain

- File: `apps/web/src/hooks/useMessaging.ts`

- Symbol: `connect/useEffect`

- Lines: 72-230


## Reproduction Steps

1. Render DMInbox and trigger state changes unrelated to connection

2. Observe repeated connect/disconnect logs


## Impact

Unnecessary websocket reconnects, duplicate event setup, and avoidable API/socket load.


## Suggested Fix

**Approach:** Stabilize callbacks with refs inside hook or memoize callbacks in caller with `useCallback`; isolate connection effect from volatile handlers.

**Affected files:** `apps/web/src/hooks/useMessaging.ts` `apps/web/src/components/messaging/DMInbox.tsx`

**Effort:** small

**Risk:** Careful to avoid stale event handlers.


## Tests Needed

- [ ] Hook test asserting single connection across rerenders


## Related Findings

_(none)_


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
