# Finding: f-eee630c1

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** debt | **Confidence:** evidence

## Title

Tip leaderboard enrichment issues one Prisma user query per aggregated bucket

## Description

Promise.all maps tips group rows to user.findUnique calls.

## Impact

DB chatter scales linearly with leaderboard depth.

## Suggested fix

See synthesizer / agent notes.

**Affected files:** —

## Proof hooks

- **[code_ref]** Promise.all maps grouped buckets to user lookups.
  - File: `apps/api/src/core/monetization/services/wallet.service.ts`

## History

- 2026-04-29T20:18:42Z — **performance-cost-auditor** — created

---
*Last canonical synthesizer run: `synthesized-20260429-214530`*
