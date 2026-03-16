#!/usr/bin/env python3
"""
LYRA Run File Migration Script

Fixes existing run files to conform to LYRA schema v1.1.0.
Writes fixed files in-place (makes backups with .bak extension).

Usage:
  python3 audits/migrate_run_files.py              # Fix all files in audits/runs/
  python3 audits/migrate_run_files.py <file.json>  # Fix a single file
"""

import json
import sys
import os
import shutil
from pathlib import Path
from datetime import datetime, timezone

RUNS_DIR = os.path.join(os.path.dirname(__file__), "runs")

# Canonical run_metadata to inject when missing.
# These values reflect the environment in which the original runs were produced.
DEFAULT_RUN_METADATA = {
    "timestamp": None,          # derived from run_id or file mtime
    "branch": "main",
    "environment": "local",
    "tool_platform": "cursor",
    "model": "claude-sonnet-4-5",
}

VALID_SEVERITY = {"blocker", "major", "minor", "nit"}
VALID_TYPE = {"bug", "enhancement", "debt", "question"}
VALID_CONFIDENCE = {"evidence", "inference", "speculation"}
VALID_STATUS = {
    "open", "accepted", "in_progress", "fixed_pending_verify", "fixed_verified",
    "wont_fix", "deferred", "duplicate", "converted_to_enhancement"
}
VALID_HISTORY_EVENT = {
    "created", "repro_confirmed", "hypothesis_added", "patch_proposed",
    "patch_applied", "verification_passed", "verification_failed", "reopened",
    "deferred", "wont_fix", "linked_duplicate", "scope_changed",
    "severity_changed", "split_into_children", "converted_type", "note_added"
}
VALID_EFFORT = {"trivial", "small", "medium", "large", "epic"}

# Enum remapping tables — agents that emit non-standard values get normalized here.
SEVERITY_MAP = {
    "critical": "blocker",
    "high": "major",
    "medium": "minor",
    "moderate": "minor",
    "low": "nit",
    "info": "nit",
    "informational": "nit",
    "warning": "minor",
    "error": "blocker",
    # Priority values mistakenly used as severity
    "p0": "blocker",
    "p1": "major",
    "p2": "minor",
    "p3": "nit",
    # Status values mistakenly used as severity
    "resolved": "minor",
    "fixed": "minor",
}

TYPE_MAP = {
    "performance": "debt",
    "cost": "debt",
    "dead_code": "debt",
    "refactor": "debt",
    "security": "bug",
    "vulnerability": "bug",
    "risk": "bug",
    "exposure": "bug",
    "feature": "enhancement",
    "improvement": "enhancement",
    "missing_feature": "enhancement",
}

STATUS_MAP = {
    "fixed": "fixed_verified",
    "resolved": "fixed_verified",
    "closed": "fixed_verified",
    "done": "fixed_verified",
    "complete": "fixed_verified",
    "completed": "fixed_verified",
    "verified": "fixed_verified",
    "pending": "fixed_pending_verify",
    "pending_verify": "fixed_pending_verify",
    "in-progress": "in_progress",
    "active": "in_progress",
    "working": "in_progress",
    "skipped": "deferred",
    "ignored": "wont_fix",
    "invalid": "wont_fix",
    "false_positive": "wont_fix",
    "wontfix": "wont_fix",
    "wont-fix": "wont_fix",
    "converted": "converted_to_enhancement",
}

HISTORY_EVENT_MAP = {
    # Status values mistakenly used as history events
    "fixed": "patch_applied",
    "fixed_verified": "verification_passed",
    "fixed_pending_verify": "patch_applied",
    "resolved": "verification_passed",
    "in_progress": "patch_proposed",
    "deferred_status": "deferred",
    # Custom/invented event names
    "history_checked": "note_added",
    "decision_deferred": "deferred",
    "re_reported": "note_added",
    "updated": "note_added",
    "status_changed": "note_added",
    "comment": "note_added",
    "started": "patch_proposed",
    "verified": "verification_passed",
    "closed": "verification_passed",
    "reopened_finding": "reopened",
    "linked": "linked_duplicate",
    "split": "split_into_children",
    "type_changed": "converted_type",
}


def derive_timestamp(data: dict, filepath: str) -> str:
    """Derive a best-effort ISO 8601 timestamp from available sources."""
    # 1. Existing top-level timestamp field
    if "timestamp" in data:
        ts = data["timestamp"]
        if isinstance(ts, str) and ts:
            return ts

    # 2. Extract from run_id (format: suite-YYYYMMDD-HHmmss)
    run_id = data.get("run_id", "")
    if run_id:
        parts = run_id.split("-")
        for i, p in enumerate(parts):
            if len(p) == 8 and p.isdigit() and i + 1 < len(parts):
                time_part = parts[i + 1]
                if len(time_part) == 6 and time_part.isdigit():
                    try:
                        ts = datetime.strptime(f"{p}{time_part}", "%Y%m%d%H%M%S")
                        return ts.strftime("%Y-%m-%dT%H:%M:%SZ")
                    except ValueError:
                        pass

    # 3. File modification time
    try:
        mtime = os.path.getmtime(filepath)
        return datetime.fromtimestamp(mtime, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except OSError:
        pass

    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_run_metadata(data: dict, filepath: str) -> dict:
    """Build a conformant run_metadata object."""
    existing = data.get("run_metadata", {}) or {}
    ts = existing.get("timestamp") or derive_timestamp(data, filepath)

    return {
        "timestamp": ts,
        "branch": existing.get("branch", DEFAULT_RUN_METADATA["branch"]),
        "environment": existing.get("environment", DEFAULT_RUN_METADATA["environment"]),
        "tool_platform": existing.get("tool_platform", DEFAULT_RUN_METADATA["tool_platform"]),
        "model": existing.get("model", DEFAULT_RUN_METADATA["model"]),
    }


def fix_severity(value: str) -> str:
    v = value.lower() if isinstance(value, str) else str(value).lower()
    if v in VALID_SEVERITY:
        return v
    mapped = SEVERITY_MAP.get(v)
    if mapped:
        return mapped
    # Unknown value — default to minor to avoid schema rejection
    return "minor"


def fix_confidence(value: str) -> str:
    v = value.lower() if isinstance(value, str) else str(value).lower()
    if v in VALID_CONFIDENCE:
        return v
    CONFIDENCE_MAP = {
        "certain": "evidence",
        "confirmed": "evidence",
        "observed": "evidence",
        "likely": "inference",
        "probable": "inference",
        "inferred": "inference",
        "possible": "speculation",
        "guess": "speculation",
        "unknown": "speculation",
    }
    return CONFIDENCE_MAP.get(v, "inference")


def fix_type(value: str) -> str:
    v = value.lower() if isinstance(value, str) else str(value).lower()
    if v in VALID_TYPE:
        return v
    mapped = TYPE_MAP.get(v)
    if mapped:
        return mapped
    # Unknown value — default to debt
    return "debt"


def fix_status(value: str) -> str:
    v = value.lower() if isinstance(value, str) else str(value).lower()
    if v in VALID_STATUS:
        return v
    mapped = STATUS_MAP.get(v)
    if mapped:
        return mapped
    # Unknown value — default to open
    return "open"


VALID_HOOK_TYPES = {
    "code_ref", "error_text", "command", "repro_steps", "ui_path",
    "data_shape", "log_line", "config_key", "query", "artifact_ref"
}


def fix_proof_hooks(hooks: list, finding: dict = None) -> list:
    """Normalize proof hooks — ensure each has hook_type and summary."""
    if not hooks:
        # Build a minimal proof hook from the finding description
        if finding:
            desc = finding.get("description", "")[:120]
        else:
            desc = "See description for details."
        return [{
            "hook_type": "code_ref",
            "summary": desc or "See description for details."
        }]

    fixed = []
    for h in hooks:
        hook = dict(h)
        # Rename "type" -> "hook_type" (common agent mistake)
        if "hook_type" not in hook and "type" in hook:
            hook["hook_type"] = hook.pop("type")
        # If still missing hook_type, default to code_ref
        if "hook_type" not in hook:
            hook["hook_type"] = "code_ref"
        # Normalize hook_type to valid enum value
        ht = hook.get("hook_type", "")
        if ht not in VALID_HOOK_TYPES:
            # Map common mismatches
            HOOK_TYPE_MAP = {
                "data_ref": "data_shape",
                "log": "log_line",
                "config": "config_key",
                "sql": "query",
                "artifact": "artifact_ref",
                "steps": "repro_steps",
                "ui": "ui_path",
                "error": "error_text",
            }
            hook["hook_type"] = HOOK_TYPE_MAP.get(ht, "code_ref")
        # Ensure summary exists
        if "summary" not in hook:
            # Try to derive from proof, error_text, or command fields
            summary = (
                hook.get("proof")
                or hook.get("error_text", "")[:120]
                or hook.get("command", "")[:120]
                or f"{hook.get('hook_type', 'hook')} at {hook.get('file', 'unknown')}"
            )
            hook["summary"] = summary
        # Remove non-standard field "proof" (migrate to summary if it was the value)
        hook.pop("proof", None)
        # Normalize line_range -> start_line/end_line
        if "line_range" in hook and isinstance(hook["line_range"], list):
            lr = hook["line_range"]
            if len(lr) >= 1 and "start_line" not in hook:
                hook["start_line"] = lr[0]
            if len(lr) >= 2 and "end_line" not in hook:
                hook["end_line"] = lr[1]
            del hook["line_range"]
        fixed.append(hook)
    return fixed


def code_refs_to_proof_hooks(code_refs: list) -> list:
    """Convert legacy code_refs array to proof_hooks format."""
    proof_hooks = []
    for ref in code_refs:
        hook = dict(ref)
        # Normalize hook_type
        if "hook_type" not in hook:
            hook["hook_type"] = "code_ref"
        # Ensure summary
        if "summary" not in hook:
            proof = hook.pop("proof", None)
            summary = (
                proof
                or hook.get("error_text", "")[:120]
                or f"{hook.get('hook_type', 'code_ref')} at {hook.get('file', 'unknown')}"
            )
            hook["summary"] = summary
        else:
            hook.pop("proof", None)
        # Normalize line_range
        if "line_range" in hook and isinstance(hook["line_range"], list):
            lr = hook["line_range"]
            if len(lr) >= 1 and "start_line" not in hook:
                hook["start_line"] = lr[0]
            if len(lr) >= 2 and "end_line" not in hook:
                hook["end_line"] = lr[1]
            del hook["line_range"]
        proof_hooks.append(hook)
    return proof_hooks


def fix_suggested_fix(sf, finding: dict) -> dict:
    """Normalize suggested_fix to object with approach field."""
    if isinstance(sf, str):
        # String -> wrap in object
        effort = finding.get("estimated_effort", "small")
        if effort not in VALID_EFFORT:
            effort = "small"
        result = {"approach": sf}
        if effort:
            result["estimated_effort"] = effort
        affected = []
        for hook in finding.get("proof_hooks", finding.get("code_refs", [])):
            f = hook.get("file")
            if f and f not in affected:
                affected.append(f)
        if affected:
            result["affected_files"] = affected
        return result
    if isinstance(sf, dict):
        result = dict(sf)
        if "approach" not in result:
            # Try to fill from known fields
            result["approach"] = (
                sf.get("description")
                or sf.get("detail")
                or sf.get("notes")
                or "See description for fix approach."
            )
        # Normalize effort
        if "effort_estimate" in result and "estimated_effort" not in result:
            result["estimated_effort"] = result.pop("effort_estimate").split(" ")[0].lower()
        if "estimated_effort" in result and result["estimated_effort"] not in VALID_EFFORT:
            del result["estimated_effort"]
        return result
    # None/missing — create minimal
    effort = finding.get("estimated_effort", "small")
    rec = finding.get("recommendation", "")
    approach = rec if rec else "See description for details."
    result = {"approach": approach[:500]}
    if effort and effort in VALID_EFFORT:
        result["estimated_effort"] = effort
    return result


def build_history(finding: dict, timestamp: str) -> list:
    """Build or normalize a finding's history array."""
    existing = finding.get("history", [])
    if isinstance(existing, list) and len(existing) > 0:
        fixed = []
        for event in existing:
            e = dict(event)
            # Rename event_type -> event
            if "event_type" in e and "event" not in e:
                e["event"] = e.pop("event_type")
            # Rename note -> notes
            if "note" in e and "notes" not in e:
                e["notes"] = e.pop("note")
            # Ensure actor
            if "actor" not in e:
                e["actor"] = "schema-auditor"
            # Ensure timestamp
            if "timestamp" not in e:
                e["timestamp"] = timestamp
            # Fix event enum
            event_val = e.get("event", "")
            if event_val not in VALID_HISTORY_EVENT:
                v = event_val.lower() if isinstance(event_val, str) else ""
                e["event"] = HISTORY_EVENT_MAP.get(v, "note_added")
            fixed.append(e)
        return fixed

    # Create minimal history
    return [{
        "timestamp": timestamp,
        "actor": finding.get("agent_source", "schema-auditor"),
        "event": "created",
        "notes": "Finding created during audit run."
    }]


def derive_impact(finding: dict) -> str:
    """Derive an impact string from existing finding fields."""
    # Try existing impact
    imp = finding.get("impact")
    if imp:
        return imp

    # Construct from details
    details = finding.get("details", {})
    if isinstance(details, dict) and "impact" in details:
        return details["impact"]

    rec = finding.get("recommendation", "")
    desc = finding.get("description", "")
    severity = finding.get("severity", "minor")

    if rec:
        return f"{rec[:200]}"
    if desc:
        return f"If not fixed: {desc[:200]}"

    return f"Severity {severity} issue. See description for details."


def fix_coverage(cov: dict) -> dict:
    """Normalize coverage object — convert int counts to arrays where needed."""
    result = dict(cov)
    if isinstance(result.get("files_examined"), int):
        count = result["files_examined"]
        result["files_examined"] = [f"<{count} files examined, list unavailable>"]
    if isinstance(result.get("files_skipped"), int):
        count = result["files_skipped"]
        if count == 0:
            result["files_skipped"] = []
        else:
            result["files_skipped"] = [f"<{count} files skipped, list unavailable>"]
    # incomplete_reason must be a string when present (schema type: string)
    # If coverage_complete is True and incomplete_reason is null, remove it
    # If coverage_complete is False and incomplete_reason is null/empty, add a placeholder
    if result.get("coverage_complete") is False:
        ir = result.get("incomplete_reason")
        if ir is None or not isinstance(ir, str) or not ir.strip():
            result["incomplete_reason"] = "Reason not recorded in original output."
    else:
        # coverage_complete is True (or unset): remove null incomplete_reason
        if "incomplete_reason" in result and result["incomplete_reason"] is None:
            del result["incomplete_reason"]
    return result


def fix_next_actions(next_actions: list) -> list:
    """Normalize next_actions to require action, finding_id, rationale."""
    fixed = []
    for na in next_actions:
        if not isinstance(na, dict):
            continue
        item = dict(na)
        # Map old fields to new required fields
        if "action" not in item:
            item["action"] = item.get("detail", item.get("description", "Review finding"))
        if "finding_id" not in item:
            item["finding_id"] = item.get("blocked_by", item.get("finding", "unknown"))
        if "rationale" not in item:
            item["rationale"] = (
                item.get("detail")
                or item.get("description")
                or f"Priority {item.get('priority', '?')} action."
            )
        # Remove old-format fields
        for old in ("priority", "detail", "blocked_by", "description"):
            item.pop(old, None)
        fixed.append(item)
    return fixed


def fix_findings(findings: list, run_timestamp: str) -> list:
    """Fix all findings to conform to schema v1.1.0."""
    fixed = []
    for f in findings:
        finding = dict(f)

        # 1. finding_id: rename 'id' -> 'finding_id'
        if "finding_id" not in finding and "id" in finding:
            finding["finding_id"] = finding.pop("id")

        # 2. type: normalize enum (lowercase, remap invalid values)
        if "type" in finding:
            finding["type"] = fix_type(finding["type"])

        # 3. severity: must be lowercase
        if "severity" in finding:
            finding["severity"] = fix_severity(finding["severity"])

        # 4. confidence: must be lowercase
        if "confidence" in finding:
            finding["confidence"] = fix_confidence(finding["confidence"])

        # 5. proof_hooks: rename code_refs or normalize existing
        if "proof_hooks" not in finding:
            if "code_refs" in finding:
                finding["proof_hooks"] = code_refs_to_proof_hooks(finding.pop("code_refs"))
            else:
                # Build minimal proof hook from description
                finding["proof_hooks"] = [{
                    "hook_type": "code_ref",
                    "summary": f"See description: {finding.get('description', '')[:120]}"
                }]
        else:
            finding["proof_hooks"] = fix_proof_hooks(finding["proof_hooks"], finding)
            finding.pop("code_refs", None)

        # 6. impact: add if missing
        if "impact" not in finding:
            finding["impact"] = derive_impact(finding)

        # 7. suggested_fix: normalize to object with approach
        if "suggested_fix" not in finding:
            sf = fix_suggested_fix(None, finding)
        else:
            sf = fix_suggested_fix(finding["suggested_fix"], finding)
        finding["suggested_fix"] = sf

        # 8. history: build if missing or fix existing
        finding["history"] = build_history(finding, run_timestamp)

        # 9. status: normalize to valid enum or default to open
        if "status" not in finding:
            finding["status"] = "open"
        else:
            finding["status"] = fix_status(finding["status"])

        # 10. category: if missing, derive from type or default
        if "category" not in finding:
            finding["category"] = "uncategorized"

        # 11. title: truncate to 120 chars (schema maxLength)
        if "title" in finding and isinstance(finding["title"], str) and len(finding["title"]) > 120:
            finding["title"] = finding["title"][:117] + "..."

        # 12. Required fields with safe defaults for old-format files
        if "type" not in finding:
            finding["type"] = "debt"
        if "priority" not in finding:
            # Try to derive from severity
            sev = finding.get("severity", "minor")
            finding["priority"] = {"blocker": "P0", "major": "P1", "minor": "P2", "nit": "P3"}.get(sev, "P2")
        if "confidence" not in finding:
            finding["confidence"] = "inference"
        if "description" not in finding:
            finding["description"] = finding.get("title", "No description provided.")
        if "impact" not in finding:
            finding["impact"] = derive_impact(finding)

        # Remove non-standard root-level fields that were migrated
        for old in ("estimated_effort", "estimated_effort_days", "recommendation",
                    "details", "agent_source", "code_refs"):
            finding.pop(old, None)

        fixed.append(finding)
    return fixed


def fix_rollups(rollups: dict) -> dict:
    """Ensure rollups has all required keys."""
    result = dict(rollups) if isinstance(rollups, dict) else {}
    for key in ("by_severity", "by_category", "by_type", "by_status"):
        if key not in result:
            result[key] = {}
    return result


def load_schema() -> dict | None:
    """Load the LYRA audit-output JSON schema."""
    schema_path = os.path.join(os.path.dirname(__file__), "schema", "audit-output.schema.json")
    try:
        with open(schema_path) as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return None


def validate_against_schema(data: dict, schema: dict) -> list[str]:
    """
    Validate data against the JSON schema.
    Returns a list of validation error messages (empty list = valid).
    """
    try:
        import jsonschema
        validator = jsonschema.Draft7Validator(schema)
        errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
        return [f"{'.'.join(str(p) for p in e.path) or '<root>'}: {e.message}" for e in errors]
    except ImportError:
        return ["jsonschema not installed — skipping schema validation (pip install jsonschema)"]
    except Exception as e:
        return [f"Schema validation error: {e}"]


def fix_file(filepath: str, dry_run: bool = False) -> tuple[bool, list[str]]:
    """
    Fix a single run file in-place.
    Returns (changed: bool, changes: list of descriptions).
    """
    with open(filepath) as f:
        data = json.load(f)

    changes = []
    original = json.dumps(data, sort_keys=True)

    # Determine run timestamp for history events
    run_timestamp = derive_timestamp(data, filepath)

    # 0. Ensure top-level required fields: schema_version, kind
    if data.get("schema_version") != "1.1.0":
        data["schema_version"] = "1.1.0"
        changes.append("Set schema_version to 1.1.0")
    if "kind" not in data:
        # Infer from run_id or agent name
        run_id = data.get("run_id", "")
        if "synthesiz" in run_id.lower() or "synthesiz" in str(data.get("agent", {}).get("name", "")).lower():
            data["kind"] = "synthesizer_output"
        else:
            data["kind"] = "agent_output"
        changes.append(f"Set kind to {data['kind']}")

    # 1. run_metadata
    if "run_metadata" not in data or not isinstance(data.get("run_metadata"), dict):
        data["run_metadata"] = build_run_metadata(data, filepath)
        changes.append("Added run_metadata")
    else:
        rm = build_run_metadata(data, filepath)
        data["run_metadata"] = rm
        changes.append("Normalized run_metadata")

    # 2. coverage
    if "coverage" in data:
        old_cov = json.dumps(data["coverage"], sort_keys=True)
        data["coverage"] = fix_coverage(data["coverage"])
        if json.dumps(data["coverage"], sort_keys=True) != old_cov:
            changes.append("Fixed coverage (converted int counts to arrays)")

    # 3. findings (support "open_findings" as alias used by open_findings.json)
    findings_key = "findings"
    if "findings" not in data and "open_findings" in data:
        findings_key = "open_findings"
    if findings_key in data:
        old_findings = json.dumps(data[findings_key], sort_keys=True)
        data[findings_key] = fix_findings(data[findings_key], run_timestamp)
        if json.dumps(data[findings_key], sort_keys=True) != old_findings:
            changes.append(f"Fixed {len(data[findings_key])} findings")

    # 4. rollups
    if "rollups" in data:
        old_rollups = json.dumps(data["rollups"], sort_keys=True)
        data["rollups"] = fix_rollups(data["rollups"])
        if json.dumps(data["rollups"], sort_keys=True) != old_rollups:
            changes.append("Fixed rollups (added missing keys)")
    else:
        data["rollups"] = {"by_severity": {}, "by_category": {}, "by_type": {}, "by_status": {}}
        changes.append("Added missing rollups")

    # 3b. Ensure required top-level fields: suite, agent, findings
    if "suite" not in data:
        # Infer from run_id
        run_id = data.get("run_id", "")
        suite_map = {
            "security": "security", "logic": "logic", "data": "data",
            "ux": "ux", "perf": "performance", "performance": "performance",
            "deploy": "deploy", "synthesiz": "synthesized",
        }
        inferred = "logic"
        for key, val in suite_map.items():
            if key in run_id.lower():
                inferred = val
                break
        data["suite"] = inferred
        changes.append(f"Set suite to '{inferred}' (inferred from run_id)")
    if "agent" not in data or not isinstance(data.get("agent"), dict):
        agent_name = str(data.get("agent", "")) or "unknown-agent"
        data["agent"] = {
            "name": agent_name,
            "role": "Audit agent (name/role inferred during migration).",
        }
        changes.append("Added minimal agent object")
    else:
        if "role" not in data["agent"]:
            data["agent"]["role"] = "Audit agent (role not recorded in original output)."
            changes.append("Added missing agent.role")
    if "findings" not in data and "open_findings" not in data:
        data["findings"] = []
        changes.append("Added missing findings (empty array)")

    # 4a. ranked_plan: normalize top_fixes array (strings -> objects)
    if "ranked_plan" in data and isinstance(data.get("ranked_plan"), dict):
        rp = data["ranked_plan"]
        if "top_fixes" in rp and isinstance(rp["top_fixes"], list):
            fixed_top = []
            for item in rp["top_fixes"]:
                if isinstance(item, str):
                    fixed_top.append({
                        "finding_id": item,
                        "why_now": "Finding ranked as high priority.",
                        "estimated_effort": "small",
                    })
                else:
                    fixed_top.append(item)
            if fixed_top != rp["top_fixes"]:
                rp["top_fixes"] = fixed_top
                changes.append("Fixed ranked_plan.top_fixes (converted bare finding_id strings to objects)")
        # Add missing required ranked_plan sub-fields
        for req_field, default in [("commit_plan", []), ("regression_checklist", []), ("reaudit_plan", [])]:
            if req_field not in rp:
                rp[req_field] = default
                changes.append(f"Added missing ranked_plan.{req_field}")

    # 4b. diff_summary: normalize changed_severity/changed_status/converted_type arrays
    if "diff_summary" in data and isinstance(data["diff_summary"], dict):
        ds = data["diff_summary"]
        for key in ("changed_severity", "changed_status", "converted_type"):
            if key in ds and isinstance(ds[key], list):
                fixed_items = []
                for item in ds[key]:
                    if isinstance(item, str):
                        # String-only entry — convert to minimal conformant object
                        field_map = {
                            "changed_severity": {"finding_id": item, "old_severity": "unknown", "new_severity": "unknown"},
                            "changed_status": {"finding_id": item, "old_status": "unknown", "new_status": "unknown"},
                            "converted_type": {"finding_id": item, "old_type": "unknown", "new_type": "unknown"},
                        }
                        fixed_items.append(field_map[key])
                    else:
                        fixed_items.append(item)
                if fixed_items != ds[key]:
                    ds[key] = fixed_items
                    changes.append(f"Fixed diff_summary.{key} (converted bare strings to objects)")

    # 5. next_actions
    if "next_actions" not in data:
        data["next_actions"] = []
        changes.append("Added missing next_actions (empty array)")
    else:
        old_na = json.dumps(data["next_actions"], sort_keys=True)
        data["next_actions"] = fix_next_actions(data["next_actions"])
        if json.dumps(data["next_actions"], sort_keys=True) != old_na:
            changes.append("Fixed next_actions format")

    # 6. Remove non-schema top-level fields (keep unknown fields for forward compat)
    for old_field in ("timestamp",):  # timestamp was moved into run_metadata
        if old_field in data and old_field != "run_metadata":
            del data[old_field]
            changes.append(f"Removed legacy top-level field '{old_field}'")

    new_json = json.dumps(data, sort_keys=True)
    changed = new_json != original

    # Validate fixed output against schema before writing.
    # open_findings.json uses "open_findings" key (not "findings") and is a live state
    # file rather than a run output — validate findings-level enums only for it.
    schema = load_schema()
    has_open_findings = "open_findings" in data and "findings" not in data
    if schema and data.get("schema_version") == "1.1.0" and not has_open_findings:
        validation_errors = validate_against_schema(data, schema)
        if validation_errors:
            changes.append(f"WARNING: {len(validation_errors)} schema validation error(s) remain after migration:")
            for err in validation_errors[:10]:
                changes.append(f"  schema: {err}")
            if len(validation_errors) > 10:
                changes.append(f"  ... and {len(validation_errors) - 10} more")
        else:
            changes.append("Schema validation passed (v1.1.0 conformant)")

    if changed and not dry_run:
        # Backup original
        backup_path = filepath + ".bak"
        shutil.copy2(filepath, backup_path)
        # Write fixed file
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")

    return changed, changes


def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    args = [a for a in args if not a.startswith("--")]

    if args:
        files = []
        for arg in args:
            p = Path(arg)
            if p.is_file():
                files.append(str(p))
            elif p.is_dir():
                files.extend(sorted(str(f) for f in p.rglob("*.json")
                                    if ".bak" not in str(f)))
    else:
        runs_path = Path(RUNS_DIR)
        files = sorted(str(f) for f in runs_path.rglob("*.json")
                       if ".bak" not in str(f)) if runs_path.exists() else []

    if not files:
        print("No files found.")
        sys.exit(0)

    total_changed = 0
    for filepath in files:
        try:
            changed, changes = fix_file(filepath, dry_run=dry_run)
            status = "FIXED" if changed else "OK"
            if dry_run:
                status = "WOULD FIX" if changed else "OK"
            print(f"{status}: {filepath}")
            for c in changes:
                print(f"  - {c}")
        except Exception as e:
            print(f"ERROR: {filepath}: {e}")
            import traceback
            traceback.print_exc()
        if changed:
            total_changed += 1

    mode = "(dry run)" if dry_run else ""
    print(f"\n{'Would fix' if dry_run else 'Fixed'} {total_changed}/{len(files)} files {mode}")


if __name__ == "__main__":
    main()
