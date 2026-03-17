#!/usr/bin/env python3
"""
LYRA Run File Migration Script

Fixes existing run files to conform to LYRA schema v1.1.0.
Writes fixed files in-place (makes backups with .bak extension).

Usage:
  python3 audits/migrate_run_files.py              # Fix all files in audits/runs/
  python3 audits/migrate_run_files.py <file.json>  # Fix a single file
  python3 audits/migrate_run_files.py --validate <file.json>  # Validate only (no writes)
  python3 audits/migrate_run_files.py --dry-run    # Show what would change without writing
"""

import json
import sys
import os
import shutil
from pathlib import Path
from datetime import datetime, timezone

# Optional jsonschema dependency for strict schema validation
try:
    import jsonschema
    _JSONSCHEMA_AVAILABLE = True
except ImportError:
    _JSONSCHEMA_AVAILABLE = False

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema", "audit-output.schema.json")
_SCHEMA_CACHE = None


def load_schema() -> dict:
    """Load and cache the LYRA audit output schema."""
    global _SCHEMA_CACHE
    if _SCHEMA_CACHE is None and os.path.exists(SCHEMA_PATH):
        with open(SCHEMA_PATH) as f:
            _SCHEMA_CACHE = json.load(f)
    return _SCHEMA_CACHE


def validate_against_schema(data: dict) -> list[str]:
    """
    Validate data against LYRA schema v1.1.0.
    Returns a list of validation error messages (empty = valid).
    Falls back to lightweight checks if jsonschema is not installed.
    """
    schema = load_schema()
    if schema is None:
        return ["Schema file not found at: " + SCHEMA_PATH]

    if _JSONSCHEMA_AVAILABLE:
        validator = jsonschema.Draft7Validator(schema)
        errors = [e.message for e in sorted(validator.iter_errors(data), key=str)]
        return errors

    # Lightweight fallback validation (no jsonschema library)
    errors = []
    required_top = ["schema_version", "kind", "run_id", "run_metadata", "suite",
                    "agent", "findings", "rollups", "next_actions"]
    for field in required_top:
        if field not in data:
            errors.append(f"missing required top-level field: '{field}'")

    if data.get("schema_version") != "1.1.0":
        errors.append(f"schema_version must be '1.1.0', got: {data.get('schema_version')!r}")

    if data.get("kind") not in ("agent_output", "synthesizer_output"):
        errors.append(f"kind must be 'agent_output' or 'synthesizer_output', got: {data.get('kind')!r}")

    rm = data.get("run_metadata", {})
    for rf in ("timestamp", "branch", "environment", "tool_platform", "model"):
        if rf not in rm:
            errors.append(f"run_metadata missing required field: '{rf}'")

    rollups = data.get("rollups", {})
    for rk in ("by_severity", "by_category", "by_type", "by_status"):
        if rk not in rollups:
            errors.append(f"rollups missing required key: '{rk}'")

    for i, finding in enumerate(data.get("findings", [])):
        fid = finding.get("finding_id", f"finding[{i}]")
        for ff in ("finding_id", "type", "category", "severity", "priority",
                   "confidence", "title", "description", "proof_hooks",
                   "impact", "suggested_fix", "status", "history"):
            if ff not in finding:
                errors.append(f"{fid}: missing required field '{ff}'")

        if finding.get("type") not in (None, "bug", "enhancement", "debt", "question"):
            errors.append(f"{fid}: type invalid enum: {finding.get('type')!r}")

        if finding.get("severity") not in (None, "blocker", "major", "minor", "nit"):
            errors.append(f"{fid}: severity invalid enum: {finding.get('severity')!r}")

        if finding.get("confidence") not in (None, "evidence", "inference", "speculation"):
            errors.append(f"{fid}: confidence invalid enum: {finding.get('confidence')!r}")

        hooks = finding.get("proof_hooks", [])
        if isinstance(hooks, list) and len(hooks) == 0:
            errors.append(f"{fid}: proof_hooks must have at least one item")
        for j, hook in enumerate(hooks):
            if "hook_type" not in hook:
                errors.append(f"{fid}: proof_hooks[{j}] missing 'hook_type'")
            if "summary" not in hook:
                errors.append(f"{fid}: proof_hooks[{j}] missing 'summary'")

        history = finding.get("history", [])
        if isinstance(history, list) and len(history) == 0:
            errors.append(f"{fid}: history must have at least one event")
        for k, event in enumerate(history):
            for hf in ("timestamp", "actor", "event"):
                if hf not in event:
                    errors.append(f"{fid}: history[{k}] missing '{hf}'")

    return errors

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
    v = value.lower() if isinstance(value, str) else value
    # Map non-standard severity values to the closest valid enum
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
        # Priority-style severity labels (P0/p0 = blocker, etc.)
        "p0": "blocker",
        "p1": "major",
        "p2": "minor",
        "p3": "nit",
        "p4": "nit",
        # Other common non-standard values
        "moderate": "minor",
        "severe": "blocker",
        # 'resolved' is a status value misused as severity; treat as nit
        "resolved": "nit",
    }
    result = SEVERITY_MAP.get(v, v)
    # Ensure the result is a valid enum value; default to minor if not
    if result not in VALID_SEVERITY:
        return "minor"
    return result


def fix_confidence(value: str) -> str:
    v = value.lower() if isinstance(value, str) else value
    CONFIDENCE_MAP = {
        "confirmed": "evidence",
        "verified": "evidence",
        "certain": "evidence",
        "probable": "inference",
        "likely": "inference",
        "possible": "speculation",
        "suspected": "speculation",
        "unknown": "speculation",
    }
    return CONFIDENCE_MAP.get(v, v)


def fix_status(value: str) -> str:
    v = value.lower() if isinstance(value, str) else value
    STATUS_MAP = {
        "resolved": "fixed_verified",
        "closed": "fixed_verified",
        "done": "fixed_verified",
        "fixed": "fixed_pending_verify",
        "pending": "open",
        "new": "open",
        "active": "in_progress",
        "investigating": "in_progress",
        "rejected": "wont_fix",
        "ignored": "wont_fix",
        "skipped": "wont_fix",
        "postponed": "deferred",
        "enhancement": "converted_to_enhancement",
    }
    return STATUS_MAP.get(v, v)


def fix_type(value: str) -> str:
    v = value.lower() if isinstance(value, str) else value
    # Map non-standard type values to the closest valid enum
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
        # Security-agent-specific: informational findings map to debt
        # (working-but-worth-knowing, not broken behavior or missing capability)
        "informational": "debt",
        "info": "debt",
        "observation": "debt",
        "note": "debt",
        # vulnerability / risk are bug aliases used by some agent outputs
        "vulnerability": "bug",
        "risk": "bug",
    }
    return TYPE_MAP.get(v, v)


VALID_HOOK_TYPES = {
    "code_ref", "error_text", "command", "repro_steps", "ui_path",
    "data_shape", "log_line", "config_key", "query", "artifact_ref"
}


def fix_proof_hooks(hooks: list, finding: dict = None) -> list:
    """Normalize proof hooks — ensure each has hook_type and summary."""
    if not hooks:
        # Build a minimal proof hook — use a generic reference to avoid copying
        # description text which may contain sensitive values.
        if finding:
            title = finding.get("title", "")[:80]
            summary = f"See finding: {title}" if title else "See finding description for details."
        else:
            summary = "See finding description for details."
        return [{
            "hook_type": "code_ref",
            "summary": summary
        }]

    fixed = []
    for h in hooks:
        if isinstance(h, str):
            # String proof hook: treat as a summary for a code_ref
            fixed.append({"hook_type": "code_ref", "summary": h[:120]})
            continue
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
            if not isinstance(event, dict):
                continue
            e = dict(event)
            # Rename event_type -> event
            if "event_type" in e and "event" not in e:
                e["event"] = e.pop("event_type")
            # Rename note -> notes
            if "note" in e and "notes" not in e:
                e["notes"] = e.pop("note")
            # Ensure actor is a non-empty string
            if not isinstance(e.get("actor"), str) or not e["actor"]:
                e["actor"] = "schema-auditor"
            # Ensure timestamp is a non-empty string
            if not isinstance(e.get("timestamp"), str) or not e["timestamp"]:
                e["timestamp"] = timestamp
            # Fix event enum — map non-standard values to closest valid
            event_val = e.get("event", "")
            if event_val not in VALID_HISTORY_EVENT:
                HISTORY_EVENT_MAP = {
                    "history_checked": "note_added",
                    "checked": "note_added",
                    "reviewed": "note_added",
                    "updated": "note_added",
                    "created_finding": "created",
                    "finding_created": "created",
                    "status_changed": "note_added",
                    "assigned": "note_added",
                    "commented": "note_added",
                    "priority_changed": "scope_changed",
                    "type_changed": "converted_type",
                    "decision_deferred": "deferred",
                    "decision_accepted": "note_added",
                    "decision_wont_fix": "wont_fix",
                    "decision_converted": "converted_type",
                    "linear_synced": "note_added",
                    "status_updated": "note_added",
                    "resolved": "verification_passed",
                    "fixed": "patch_applied",
                    "closed": "verification_passed",
                }
                e["event"] = HISTORY_EVENT_MAP.get(event_val, "note_added")
            fixed.append(e)
        if fixed:
            return fixed

    # Create minimal history with a single "created" event
    return [{
        "timestamp": timestamp,
        "actor": finding.get("agent_source", "schema-auditor"),
        "event": "created",
        "notes": "Finding created during audit run."
    }]


def derive_impact(finding: dict) -> str:
    """Derive an impact string from existing finding fields."""
    # Try existing impact first
    imp = finding.get("impact")
    if imp:
        return imp

    # Construct from details object
    details = finding.get("details", {})
    if isinstance(details, dict) and "impact" in details:
        return details["impact"]

    # Use title-based placeholder rather than copying description/recommendation
    # content which may contain sensitive values (URLs, tokens, etc.)
    title = finding.get("title", "")
    severity = finding.get("severity", "minor")
    if title:
        return f"Impact not recorded. See finding: {title[:100]}"
    return f"Severity {severity} issue. See finding description for details."


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
    # incomplete_reason must be a non-null string when coverage_complete is false
    if not result.get("coverage_complete", True):
        if not isinstance(result.get("incomplete_reason"), str) or not result["incomplete_reason"]:
            result["incomplete_reason"] = "Reason not recorded in original output."
    else:
        # When coverage_complete is true, incomplete_reason should not be null
        # Remove it entirely if it's null/empty to avoid schema violation
        if result.get("incomplete_reason") is None:
            result.pop("incomplete_reason", None)
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

        # 1. finding_id: rename 'id' -> 'finding_id'; lowercase legacy IDs like 'F-001'
        if "finding_id" not in finding and "id" in finding:
            finding["finding_id"] = finding.pop("id")
        # Normalize finding_id to lowercase
        if "finding_id" in finding and isinstance(finding["finding_id"], str):
            finding["finding_id"] = finding["finding_id"].lower()
        # Generate finding_id if still missing or None
        if not finding.get("finding_id"):
            import hashlib
            title = finding.get("title", "") or finding.get("description", "")[:60]
            h = hashlib.sha256(title.encode()).hexdigest()[:8]
            finding["finding_id"] = f"f-{h}"

        # 2. severity: some legacy formats put the priority (P0/P1/P2/P3) in severity
        #    and the actual severity label in a "label" field.
        sev_raw = finding.get("severity", "")
        label_raw = finding.get("label", "")
        if isinstance(sev_raw, str) and sev_raw.upper() in ("P0", "P1", "P2", "P3"):
            # severity field holds a priority value — swap them
            finding["priority"] = sev_raw.upper()
            # Use "label" as the real severity, or fall back to deriving from priority
            if label_raw:
                finding["severity"] = fix_severity(str(label_raw))
            else:
                PRIORITY_TO_SEVERITY = {"P0": "blocker", "P1": "major", "P2": "minor", "P3": "nit"}
                finding["severity"] = PRIORITY_TO_SEVERITY.get(sev_raw.upper(), "minor")
        else:
            finding["severity"] = fix_severity(sev_raw) if sev_raw else "minor"

        # Remove the migrated "label" field
        finding.pop("label", None)

        # 3. priority: must be P0–P3
        if "priority" not in finding:
            SEVERITY_TO_PRIORITY = {"blocker": "P0", "major": "P1", "minor": "P2", "nit": "P3"}
            finding["priority"] = SEVERITY_TO_PRIORITY.get(finding.get("severity", "minor"), "P2")
        else:
            pri = str(finding["priority"]).upper()
            if pri not in ("P0", "P1", "P2", "P3"):
                finding["priority"] = "P2"
            else:
                finding["priority"] = pri

        # 1b. description: map legacy description fields
        if "description" not in finding:
            finding["description"] = (
                finding.get("details", {}).get("description", "")
                if isinstance(finding.get("details"), dict)
                else finding.get("detail", "No description available.")
            )

        # 1c. proof_hooks: also handle 'evidence' field from old security agent
        if "proof_hooks" not in finding and "code_refs" not in finding:
            if "evidence" in finding:
                evidence = finding.pop("evidence")
                if isinstance(evidence, str) and evidence:
                    finding["proof_hooks"] = [{"hook_type": "artifact_ref", "summary": evidence[:300]}]
                elif isinstance(evidence, list):
                    finding["proof_hooks"] = [
                        {"hook_type": "artifact_ref", "summary": str(e)[:300]} for e in evidence if e
                    ] or [{"hook_type": "code_ref", "summary": "See description."}]

        # 1d. suggested_fix: map 'fix' -> 'suggested_fix'
        if "suggested_fix" not in finding and "fix" in finding:
            finding["suggested_fix"] = finding.pop("fix")

        # 2. type: normalize enum (lowercase, remap invalid values)
        if "type" in finding:
            finding["type"] = fix_type(finding["type"])
        if "type" not in finding or finding["type"] not in VALID_TYPE:
            # Derive from category if possible
            cat = finding.get("category", "")
            if cat in ("enhancement", "feature", "improvement"):
                finding["type"] = "enhancement"
            elif cat in ("debt", "refactor", "cost", "performance"):
                finding["type"] = "debt"
            elif cat in ("question",):
                finding["type"] = "question"
            else:
                finding["type"] = "bug"

        # 3. severity: must be lowercase valid enum; infer from "label" if present
        if "severity" not in finding and "label" in finding:
            finding["severity"] = finding.pop("label")
        if "severity" in finding:
            finding["severity"] = fix_severity(finding["severity"])
        else:
            finding["severity"] = "minor"

        # 4. confidence: must be lowercase; default to "inference" if missing
        if "confidence" in finding:
            finding["confidence"] = fix_confidence(finding["confidence"])
        else:
            finding["confidence"] = "inference"

        # 4b. type: default to "bug" if missing
        if "type" not in finding:
            finding["type"] = "bug"

        # 4c. priority: default based on severity if missing
        if "priority" not in finding:
            SEVERITY_TO_PRIORITY = {
                "blocker": "P0", "major": "P1", "minor": "P2", "nit": "P3",
            }
            finding["priority"] = SEVERITY_TO_PRIORITY.get(
                finding.get("severity", "minor"), "P2"
            )

        # 6. proof_hooks: build from evidence/attack_scenario/fix or code_refs
        if "proof_hooks" not in finding:
            if "code_refs" in finding:
                finding["proof_hooks"] = code_refs_to_proof_hooks(finding.pop("code_refs"))
            elif "evidence" in finding:
                # Legacy "evidence" field -> code_ref hook
                finding["proof_hooks"] = [{
                    "hook_type": "error_text",
                    "summary": str(finding["evidence"])[:120],
                    "error_text": str(finding["evidence"]),
                }]
                finding.pop("evidence", None)
            else:
                finding["proof_hooks"] = [{
                    "hook_type": "code_ref",
                    "summary": f"See finding: {title}" if title else "See finding description for details."
                }]
                # Add file references if affected_files is present
                affected = finding.get("affected_files", [])
                if affected and isinstance(affected, list):
                    finding["proof_hooks"][0]["file"] = affected[0]
        else:
            finding["proof_hooks"] = fix_proof_hooks(finding["proof_hooks"], finding)
            finding.pop("code_refs", None)

        # 7. impact: build from attack_scenario or description
        if "impact" not in finding:
            if "attack_scenario" in finding:
                finding["impact"] = str(finding["attack_scenario"])[:500]
            else:
                finding["impact"] = derive_impact(finding)
        finding.pop("attack_scenario", None)

        # 8. suggested_fix: normalize to object with approach
        # Legacy files may use "fix" string field
        if "suggested_fix" not in finding:
            if "fix" in finding:
                finding["suggested_fix"] = fix_suggested_fix(finding.pop("fix"), finding)
            else:
                finding["suggested_fix"] = fix_suggested_fix(None, finding)
        else:
            finding["suggested_fix"] = fix_suggested_fix(finding["suggested_fix"], finding)
        finding.pop("fix", None)

        # Populate affected_files in suggested_fix from legacy top-level field
        sf = finding["suggested_fix"]
        if "affected_files" in finding and "affected_files" not in sf:
            sf["affected_files"] = finding["affected_files"]

        # 9. history: build if missing or fix existing
        finding["history"] = build_history(finding, run_timestamp)

        # 9. status: normalize enum or default to open if missing
        if "status" not in finding:
            finding["status"] = "open"
        else:
            finding["status"] = fix_status(finding["status"])

        # 11. category: if missing, derive from type or default
        if "category" not in finding:
            finding["category"] = "uncategorized"

        # 11. title: required — derive from id or description if missing
        if "title" not in finding or not finding["title"]:
            fid = finding.get("finding_id", "unknown")
            desc = finding.get("description", "")
            finding["title"] = (desc[:80] + "...") if len(desc) > 80 else (desc or fid)

        # 12. description: required — derive from available narrative fields
        if "description" not in finding or not finding["description"]:
            fix_applied = finding.get("fix_applied", "")
            attack_scenario = finding.get("attack_scenario", "")
            evidence = finding.get("evidence", "")
            finding["description"] = (
                fix_applied
                or attack_scenario
                or evidence
                or f"See finding {finding.get('finding_id', '?')} for details."
            )

        # Remove non-standard root-level fields that were migrated
        for old in ("estimated_effort", "estimated_effort_days", "recommendation",
                    "details", "agent_source", "code_refs", "evidence", "fix",
                    "affected_files", "affected_lines", "introduced_in_commit",
                    "attack_scenario", "label", "detail"):
            finding.pop(old, None)

        fixed.append(finding)
    return fixed


def fix_diff_summary(diff_summary: dict) -> dict:
    """Normalize diff_summary for synthesizer outputs."""
    result = dict(diff_summary) if isinstance(diff_summary, dict) else {}

    # changed_severity items must be objects with finding_id/old_severity/new_severity
    changed_sev = result.get("changed_severity", [])
    fixed_cs = []
    for item in changed_sev:
        if isinstance(item, str):
            # String is a finding_id — wrap with placeholder values
            fixed_cs.append({
                "finding_id": item,
                "old_severity": "unknown",
                "new_severity": "unknown",
            })
        elif isinstance(item, dict):
            cs = dict(item)
            if "finding_id" not in cs:
                cs["finding_id"] = "unknown"
            if "old_severity" not in cs:
                cs["old_severity"] = "unknown"
            if "new_severity" not in cs:
                cs["new_severity"] = "unknown"
            fixed_cs.append(cs)
    result["changed_severity"] = fixed_cs

    # changed_status items must be objects
    changed_st = result.get("changed_status", [])
    fixed_cst = []
    for item in changed_st:
        if isinstance(item, str):
            fixed_cst.append({
                "finding_id": item,
                "old_status": "unknown",
                "new_status": "unknown",
            })
        elif isinstance(item, dict):
            cst = dict(item)
            for req in ("finding_id", "old_status", "new_status"):
                if req not in cst:
                    cst[req] = "unknown"
            fixed_cst.append(cst)
    result["changed_status"] = fixed_cst

    # compared_against, new_findings, resolved_findings are required
    if "compared_against" not in result:
        result["compared_against"] = "none"
    if "new_findings" not in result:
        result["new_findings"] = []
    if "resolved_findings" not in result:
        result["resolved_findings"] = []

    return result


def fix_ranked_plan(ranked_plan: dict) -> dict:
    """Normalize ranked_plan to conform to schema (synthesizer output only)."""
    result = dict(ranked_plan) if isinstance(ranked_plan, dict) else {}

    # Fix top_fixes: items may be finding_id strings instead of PlanItem objects
    top_fixes = result.get("top_fixes", [])
    fixed_fixes = []
    for item in top_fixes:
        if isinstance(item, str):
            # String is a finding_id — wrap it
            fixed_fixes.append({
                "finding_id": item,
                "why_now": "High priority finding from audit run.",
                "estimated_effort": "small",
            })
        elif isinstance(item, dict):
            pi = dict(item)
            if "finding_id" not in pi:
                pi["finding_id"] = "unknown"
            if "why_now" not in pi:
                pi["why_now"] = pi.get("rationale", pi.get("reason", "High priority finding."))
            if "estimated_effort" not in pi:
                pi["estimated_effort"] = pi.get("effort", "small")
            if pi.get("estimated_effort") not in {"trivial", "small", "medium", "large", "epic"}:
                pi["estimated_effort"] = "small"
            fixed_fixes.append(pi)
    result["top_fixes"] = fixed_fixes

    # Ensure required keys exist
    if "commit_plan" not in result:
        result["commit_plan"] = []
    if "regression_checklist" not in result:
        result["regression_checklist"] = []
    if "reaudit_plan" not in result:
        result["reaudit_plan"] = []

    return result


def fix_rollups(rollups: dict) -> dict:
    """Ensure rollups has all required keys."""
    result = dict(rollups) if isinstance(rollups, dict) else {}
    for key in ("by_severity", "by_category", "by_type", "by_status"):
        if key not in result:
            result[key] = {}
    return result


def rebuild_rollups_from_findings(findings: list) -> dict:
    """Build rollups by counting findings by severity, category, type, and status."""
    by_severity: dict = {}
    by_category: dict = {}
    by_type: dict = {}
    by_status: dict = {}
    for f in findings:
        sev = f.get("severity", "unknown")
        by_severity[sev] = by_severity.get(sev, 0) + 1
        cat = f.get("category", "unknown")
        by_category[cat] = by_category.get(cat, 0) + 1
        t = f.get("type", "unknown")
        by_type[t] = by_type.get(t, 0) + 1
        st = f.get("status", "open")
        by_status[st] = by_status.get(st, 0) + 1
    return {
        "by_severity": by_severity,
        "by_category": by_category,
        "by_type": by_type,
        "by_status": by_status,
    }


def fix_file(filepath: str, dry_run: bool = False) -> tuple[bool, list[str], list[str]]:
    """
    Fix a single run file in-place.
    Returns (changed: bool, changes: list of descriptions, validation_errors: list of strings).
    Validation errors are checked AFTER fixing; an empty list means the output is schema-conformant.
    """
    with open(filepath) as f:
        data = json.load(f)

    changes = []
    original = json.dumps(data, sort_keys=True)

    # Require schema_version; default to 1.1.0 if missing
    if "schema_version" not in data:
        data["schema_version"] = "1.1.0"
        changes.append("Added missing schema_version: '1.1.0'")
    elif data["schema_version"] != "1.1.0":
        changes.append(f"Warning: schema_version is {data['schema_version']!r} (expected '1.1.0')")

    # Require kind; default to agent_output if missing
    if "kind" not in data:
        data["kind"] = "agent_output"
        changes.append("Added missing kind: 'agent_output'")

    # Require suite — derive from run_id if missing
    if "suite" not in data:
        run_id = data.get("run_id", "")
        suite = run_id.split("-")[0] if run_id else "unknown"
        if suite in ("synthesized", "synthesizer"):
            suite = "synthesized"
        data["suite"] = suite
        changes.append(f"Added missing suite: '{suite}'")

    # Require agent object with name and role
    if "agent" not in data or not isinstance(data.get("agent"), dict):
        data["agent"] = {}
        changes.append("Added missing agent object")
    agent = data["agent"]
    if "name" not in agent:
        # Derive agent name from suite
        SUITE_AGENT = {
            "data": "schema-auditor",
            "logic": "runtime-bug-hunter",
            "ux": "ux-flow-auditor",
            "performance": "performance-auditor",
            "security": "security-and-privacy-auditor",
            "deploy": "build-deploy-auditor",
            "synthesized": "synthesizer",
        }
        agent["name"] = SUITE_AGENT.get(data.get("suite", ""), "audit-agent")
        changes.append(f"Added missing agent.name: '{agent['name']}'")
    if "role" not in agent:
        agent["role"] = "Audit agent — see suite for scope."
        changes.append("Added missing agent.role")

    # Require findings array
    if "findings" not in data:
        data["findings"] = []
        changes.append("Added missing findings (empty array)")

    # Determine run timestamp for history events
    run_timestamp = derive_timestamp(data, filepath)

    # 0. schema_version — must be "1.1.0"
    if "schema_version" not in data:
        data["schema_version"] = "1.1.0"
        changes.append("Added missing schema_version '1.1.0'")

    # 0a. Merge legacy 'metadata' block into run_metadata candidates
    if "metadata" in data and isinstance(data["metadata"], dict) and "run_metadata" not in data:
        data["run_metadata"] = data.pop("metadata")
        changes.append("Promoted legacy 'metadata' field to 'run_metadata'")

    # 0b. agent.role — required field
    ROLE_BY_SUITE = {
        "logic": "Find runtime errors, logic bugs, null-safety violations, unhandled edge cases, dead code paths, and error handling gaps.",
        "data": "Find schema violations, data integrity issues, and data flow problems.",
        "ux": "Find UX flow issues, copy violations, and accessibility gaps.",
        "performance": "Find performance bottlenecks, memory leaks, and cost inefficiencies.",
        "security": "Find security vulnerabilities, privacy issues, and authentication/authorization gaps.",
        "deploy": "Find build, deploy, and infrastructure issues.",
        "synthesized": "Synthesize findings from all specialist agents into a unified report.",
    }
    suite = data.get("suite", "")
    if "agent" in data and isinstance(data["agent"], dict):
        if not data["agent"].get("role"):
            data["agent"]["role"] = ROLE_BY_SUITE.get(suite, "Audit agent.")
            changes.append(f"Added missing agent.role for suite '{suite}'")

    # 0c. synthesizer_output kind without suite/agent/findings — add stubs
    if data.get("kind") == "synthesizer_output":
        if "suite" not in data:
            data["suite"] = "synthesized"
            changes.append("Added missing suite='synthesized' for synthesizer_output")
        if "agent" not in data:
            data["agent"] = {
                "name": "synthesizer",
                "role": ROLE_BY_SUITE.get("synthesized", "Synthesize findings from all specialist agents into a unified report.")
            }
            changes.append("Added missing agent stub for synthesizer_output")
        if "findings" not in data:
            data["findings"] = []
            changes.append("Added missing findings=[] stub for synthesizer_output (delta format)")

    # 1. run_metadata
    if "run_metadata" not in data or not isinstance(data.get("run_metadata"), dict):
        # Promote legacy "metadata" field if present
        if "metadata" in data and isinstance(data["metadata"], dict):
            data["run_metadata"] = data.pop("metadata")
            changes.append("Promoted legacy 'metadata' field to 'run_metadata'")
        else:
            data["run_metadata"] = build_run_metadata(data, filepath)
            changes.append("Added run_metadata")
    rm = build_run_metadata(data, filepath)
    data["run_metadata"] = rm
    changes.append("Normalized run_metadata")

    # 2. coverage
    if "coverage" in data:
        old_cov = json.dumps(data["coverage"], sort_keys=True)
        data["coverage"] = fix_coverage(data["coverage"])
        if json.dumps(data["coverage"], sort_keys=True) != old_cov:
            changes.append("Fixed coverage (converted int counts to arrays)")

    # 3. findings — also handles legacy 'id' field and non-standard formats
    if "findings" in data:
        old_findings = json.dumps(data["findings"], sort_keys=True)
        data["findings"] = fix_findings(data["findings"], run_timestamp)
        if json.dumps(data["findings"], sort_keys=True) != old_findings:
            changes.append(f"Fixed {len(data['findings'])} findings")

    # 4. rollups
    if "rollups" in data:
        old_rollups = json.dumps(data["rollups"], sort_keys=True)
        data["rollups"] = fix_rollups(data["rollups"])
        if json.dumps(data["rollups"], sort_keys=True) != old_rollups:
            changes.append("Fixed rollups (added missing keys)")
    else:
        data["rollups"] = rebuild_rollups_from_findings(data.get("findings", []))
        changes.append("Added missing rollups (computed from findings)")

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

    # 6. ranked_plan (synthesizer output only) — fix string items and missing required fields
    if "ranked_plan" in data:
        old_rp = json.dumps(data["ranked_plan"], sort_keys=True)
        data["ranked_plan"] = fix_ranked_plan(data["ranked_plan"])
        if json.dumps(data["ranked_plan"], sort_keys=True) != old_rp:
            changes.append("Fixed ranked_plan (normalized top_fixes, added missing keys)")

    # 6b. diff_summary (synthesizer output only) — normalize changed_severity/changed_status
    if "diff_summary" in data:
        old_ds = json.dumps(data["diff_summary"], sort_keys=True)
        data["diff_summary"] = fix_diff_summary(data["diff_summary"])
        if json.dumps(data["diff_summary"], sort_keys=True) != old_ds:
            changes.append("Fixed diff_summary (normalized changed_severity/changed_status)")

    # 7. Remove non-schema top-level fields that were migrated
    for old_field in ("timestamp", "summary"):  # moved into run_metadata / rollups
        if old_field in data:
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

    # Validate final output against schema
    validation_errors = validate_against_schema(data)
    if validation_errors:
        changes.append(f"WARNING: {len(validation_errors)} schema validation error(s) remain after migration")

    return changed, changes, validation_errors


def main():
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    validate_only = "--validate" in args
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
    total_invalid = 0

    for filepath in files:
        try:
            if validate_only:
                with open(filepath) as fh:
                    data = json.load(fh)
                errs = validate_against_schema(data)
                if errs:
                    print(f"INVALID: {filepath}")
                    for e in errs:
                        print(f"  - {e}")
                    total_invalid += 1
                else:
                    print(f"VALID:   {filepath}")
                continue

            changed, changes, validation_errors = fix_file(filepath, dry_run=dry_run)
            status = "FIXED" if changed else "OK"
            if dry_run:
                status = "WOULD FIX" if changed else "OK"
            print(f"{status}: {filepath}")
            for c in changes:
                print(f"  - {c}")
            if validation_errors:
                print(f"  SCHEMA ERRORS ({len(validation_errors)} remaining):")
                for e in validation_errors:
                    print(f"    * {e}")
                total_invalid += 1
            if changed:
                total_changed += 1
        except Exception as e:
            print(f"ERROR: {filepath}: {e}")
            import traceback
            traceback.print_exc()

    mode = "(dry run)" if dry_run else ("(validate only)" if validate_only else "")
    if validate_only:
        print(f"\nValidated {len(files)} files: {len(files) - total_invalid} valid, {total_invalid} invalid {mode}")
        if total_invalid:
            sys.exit(1)
    else:
        print(f"\n{'Would fix' if dry_run else 'Fixed'} {total_changed}/{len(files)} files {mode}")
        if total_invalid:
            print(f"WARNING: {total_invalid} file(s) still have schema errors after migration.")


if __name__ == "__main__":
    main()
