# Finding: f-schema-lyra-visual-001

> **Status:** open | **Severity:** minor | **Priority:** P3 | **Type:** debt | **Confidence:** evidence

## Title

Visual audit suite outputs invalid under LYRA 1.1.0 finding contract

## Description

visual_tokens, visual_typography, visual_layout, visual_components, visual_color, and visual_polish outputs lacked required finding.history arrays (minimum one event). Five suites lacked agent.role alongside agent.name. Per ingest rules those findings were excluded from merge; rerun emitters with compliant payloads.

## Impact

Automated merge omitted substantive UX/UI findings for run c275a419 until regenerated outputs validate.

## Suggested fix

See synthesizer / agent notes.

**Affected files:** —

## Proof hooks

- **[artifact_ref]** Embedded prompt payloads for visual_* suite outputs lacked finding.history blocks.

## History

- 2026-04-29T21:45:30Z — **synthesizer** — created: Debt emitted because validated ingest discarded malformed findings rather than invent history server-side.

---
*Last canonical synthesizer run: `synthesized-20260429-214530`*
