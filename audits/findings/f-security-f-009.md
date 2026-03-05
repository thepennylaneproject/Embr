# Finding: f-security-f-009

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** inference

## Title

Stripe webhook endpoint is blocked by the global JWT guard — payment events silently dropped

## Description

The global JwtAuthGuard registered as APP_GUARD intercepts all requests including POST /api/webhooks/stripe. Stripe webhook calls carry a Stripe-Signature header, not a JWT. The endpoint returns 401 for every Stripe delivery. Payment success, payout completion, account update, and dispute events are silently dropped with no error logged on the Stripe dashboard side until retries are exhausted.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/api/src/core/monetization/webhooks/stripe-webhook.controller.ts`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Add @Public() to the StripeWebhookController class or the handleWebhook handler. The endpoint already performs Stripe signature verification via stripe.webhooks.constructEvent with the webhook secret, which is the correct authentication mechanism for this endpoint.

**Affected files:** `apps/api/src/core/monetization/webhooks/stripe-webhook.controller.ts`

**Effort:** small

**Risk:** 


## Tests Needed

- [ ] Add targeted verification tests/checks


## Related Findings

_(none)_


## Timeline

- 2026-03-05T19:44:51.494026Z | security-privacy-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
