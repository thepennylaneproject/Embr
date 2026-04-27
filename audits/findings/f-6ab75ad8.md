# Finding: f-6ab75ad8

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** bug | **Confidence:** evidence

## Title

Follow creation increments profile counters twice

## Description

FollowsService.followUser increments follower/following profile counters inside the transaction, then immediately performs a second updateMany increment after the transaction. A successful follow can therefore add 2 to each denormalized counter for a single Follow row.

## Impact

Follower/following counts drift upward and user profiles show inflated social proof; any ranking or recommendations based on these counters become unreliable.

## Suggested fix

Remove the post-transaction updateMany block or replace the transaction updates with updateMany, but keep exactly one counter increment per successful Follow create.

**Affected files:** `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts`

## Proof hooks

- **[code_ref]** Transaction increments both profile counters before returning the created Follow row.
  - File: `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts`
- **[code_ref]** A second updateMany block increments the same follower/following counters again.
  - File: `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts`

## History

- 2026-04-27T22:39:21Z — **runtime-bug-hunter** — created: Created during LYRA audit pass.

---
*Last canonical synthesizer run: `synthesized-20260427-223921`*
