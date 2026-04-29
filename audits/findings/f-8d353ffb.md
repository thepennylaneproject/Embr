# Finding: f-8d353ffb

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** debt | **Confidence:** evidence

## Title

Two sequential baseline init migrations increase ordering and drift risk

## Description

Duplicate baseline migrations increase ambiguity.

## Impact

Operational rollback friction paired with deploy rollback acceptance.

## Suggested fix

See synthesizer / agent notes.

**Affected files:** —

## Proof hooks

- **[code_ref]** First baseline migration bootstraps enums.
  - File: `apps/api/prisma/migrations/20260205071952_init/migration.sql`

## History

- 2026-04-29T20:15:00Z — **schema-auditor** — created

---
*Last canonical synthesizer run: `synthesized-20260429-214530`*
