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
VALID_HISTORY_EVENT = {
    "created", "repro_confirmed", "hypothesis_added", "patch_proposed",
    "patch_applied", "verification_passed", "verification_failed", "reopened",
    "deferred", "wont_fix", "linked_duplicate", "scope_changed",
    "severity_changed", "split_into_children", "converted_type", "note_added"
}
VALID_EFFORT = {"trivial", "small", "medium", "large", "epic"}


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
        "low": "nit",
        "info": "nit",
        "warning": "minor",
        "error": "blocker",
    }
    return SEVERITY_MAP.get(v, v)


def fix_confidence(value: str) -> str:
    return value.lower() if isinstance(value, str) else value


def fix_type(value: str) -> str:
    v = value.lower() if isinstance(value, str) else value
    # Map non-standard type values to the closest valid enum
    TYPE_MAP = {
        "performance": "debt",
        "cost": "debt",
        "dead_code": "debt",
        "refactor": "debt",
        "security": "bug",
        "feature": "enhancement",
        "improvement": "enhancement",
    }
    return TYPE_MAP.get(v, v)


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
                e["event"] = "created"
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
    if result.get("incomplete_reason") is None and result.get("coverage_complete") is False:
        result["incomplete_reason"] = "Reason not recorded in original output."
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

        # 9. status: default to open if missing
        if "status" not in finding:
            finding["status"] = "open"

        # 10. category: if missing, derive from type or default
        if "category" not in finding:
            finding["category"] = "uncategorized"

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

    # 3. findings
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
        data["rollups"] = {"by_severity": {}, "by_category": {}, "by_type": {}, "by_status": {}}
        changes.append("Added missing rollups")

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
