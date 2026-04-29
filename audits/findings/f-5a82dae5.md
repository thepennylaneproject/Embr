# Finding: f-5a82dae5

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** evidence

## Title

Marketplace addToCart throws if marketplace_cart localStorage JSON is invalid

## Description

addToCart reads marketplace_cart and calls JSON.parse without a try/catch.

## Impact

Uncaught SyntaxError blocks cart flows.

## Suggested fix

See synthesizer / agent notes.

**Affected files:** —

## Proof hooks

- **[code_ref]** JSON.parse on localStorage value with no surrounding try/catch in addToCart.
  - File: `apps/web/src/pages/marketplace/[id].tsx`

## History

- 2026-04-29T20:15:00Z — **runtime-bug-hunter** — created: Contrasted with try/catch usage in cart.tsx and checkout.

---
*Last canonical synthesizer run: `synthesized-20260429-214530`*
