# Finding: f-60ee7aca

> **Status:** fixed_verified | **Severity:** major | **Priority:** P1 | **Type:** debt | **Confidence:** evidence

## Title

runtime-bug-hunter agent output missing required `run_metadata` object (schema v1.1.0 violation)

## Description

The logic agent output at `audits/runs/2025-03-05/logic-20260305-132627.json` violates LYRA schema v1.1.0. The `run_metadata` object is a required top-level field (added in v1.1) but was absent in this run file. Additionally, the finding history contained an invalid event type (`history_checked`) not in the v1.1.0 enum.

## Proof Hooks

### [artifact_ref] Source agent output with schema violation

- Artifact: `audits/runs/2025-03-05/logic-20260305-132627.json`
- Violation: Missing required top-level field `run_metadata`

### [command] Schema validation confirming the violation

- Command: `python3 audits/validate_output.py audits/runs/2025-03-05/logic-20260305-132627.json`
- Result before fix: `[ERROR] run_metadata: Missing required top-level field 'run_metadata'`

## Reproduction Steps

1. Run `python3 audits/validate_output.py audits/runs/2025-03-05/logic-20260305-132627.json` (against pre-fix file backup `.bak`)
2. Observe `[ERROR] run_metadata: Missing required top-level field 'run_metadata'`

## Impact

Invalid agent payloads violate schema contracts, reducing trust in the audit pipeline and potentially causing downstream tooling (synthesizer, linear_sync, release gate) to misread or skip findings.

## Suggested Fix

**Approach:** Run `python3 audits/migrate_run_files.py` to add conformant `run_metadata` to all pre-v1.1.0 run files. Update agent prompt templates to fix `- -` formatting double-dash on `run_metadata` field documentation. Fix `migrate_run_files.py` to handle additional edge cases (severity enums `p0`/`p1`/`moderate`/`resolved`, missing `schema_version`, missing `agent.role`, synthesizer delta format).

**Affected files:**
- `audits/runs/2025-03-05/logic-20260305-132627.json`
- `audits/migrate_run_files.py`
- `audits/prompts/agent-logic.md`
- `audits/prompts/agent-ux.md`
- `audits/prompts/agent-performance.md`
- `audits/prompts/agent-security.md`
- `audits/prompts/agent-deploy.md`

**Effort:** small

**Risk:** Low risk; output-format-only changes.

## Tests Needed

- [x] Validate output against `audits/schema/audit-output.schema.json` before publish
- [x] All run files pass `python3 audits/validate_output.py --all`

## Related Findings

- `f-debt-schema-logic-doc` — Same violation, alternate finding ID from synthesizer
- `f-debt-schema-data-doc` — Related: data agent output also had schema violations
- `f-debt-schema-security-doc` — Related: security agent output also had schema violations

## Timeline

- 2026-03-05T20:03:12Z | synthesizer | created | Auto-created due to schema validation errors in logic agent output.
- 2026-03-16T00:00:00Z | schema-migrator | patch_applied | Migration script fixed `run_metadata` and invalid history event. All run files validated against schema v1.1.0.
- 2026-03-16T00:00:00Z | schema-migrator | verification_passed | `python3 audits/validate_output.py --all` returns exit code 0 with no violations.

## Artifacts

- Backup of pre-fix file: `audits/runs/2025-03-05/logic-20260305-132627.json.bak`

## Enhancement Notes

Added handling in `migrate_run_files.py` for additional edge cases discovered during migration: `p0`/`p1` severity labels, `moderate`/`resolved` severity values, missing `schema_version`, missing `agent.role`, and `synthesizer_output` delta format without `suite`/`agent`/`findings`.
