# Finding: f-debt-schema-security-doc

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** debt | **Confidence:** evidence

## Title

security agent output has schema-level violations

## Description

Source agent output failed one or more required schema checks.

## Proof Hooks

### [artifact_ref] schema_version missing or not 1.1.0; run_metadata missing; agent.name/agent.role missing; coverage missing

- Artifact: `audits/runs/2025-03-05/security-20260305-143000.json`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Invalid agent payloads reduce trust in automation and can hide findings from downstream tooling.


## Suggested Fix

**Approach:** Update agent template to emit schema-compliant v1.1.0 output and add schema validation in agent CI.

**Affected files:** `audits/runs/2025-03-05/security-20260305-143000.json`

**Effort:** small

**Risk:** Low.


## Tests Needed

- [ ] Validate output against audits/schema/audit-output.schema.json before publish


## Related Findings

_(none)_


## Timeline

- 2026-03-05T19:44:51.494026Z | synthesizer | created | Auto-created due to schema validation errors in source output.


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
