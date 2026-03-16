# Finding: f-perf-004

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** enhancement | **Confidence:** evidence

## Title

Stripe webhook lacks idempotency guard and can reprocess retried events

## Description

Stripe webhook handler processes events directly without storing/validating `event.id`, unlike the Mux webhook which has explicit dedupe persistence.

## Proof Hooks

### [code_ref] Stripe handler switch executes without event dedupe check

- File: `apps/api/src/core/monetization/webhooks/stripe-webhook.controller.ts`

- Symbol: `handleWebhook`

- Lines: 66-97

### [code_ref] Mux webhook uses processed-event guard

- File: `apps/api/src/core/media/controllers/mux-webhook.controller.ts`

- Symbol: `handleWebhook`

- Lines: 66-83


## Reproduction Steps

1. Replay same Stripe event payload/event.id twice

2. Observe handler side effects invoked twice


## Impact

Duplicate payout/tip processing risk and inflated metered calls/notification writes.


## Suggested Fix

**Approach:** Implement processed-event table check for Stripe events (same pattern as Mux), transactional insert+handle to guarantee idempotency.

**Affected files:** `apps/api/src/core/monetization/webhooks/stripe-webhook.controller.ts` `apps/api/prisma/schema.prisma`

**Effort:** medium

**Risk:** Requires migration and careful transaction boundaries.


## Tests Needed

- [ ] Webhook replay test asserting second delivery is no-op


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
