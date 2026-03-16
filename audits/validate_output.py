#!/usr/bin/env python3
"""
LYRA Audit Output Validator v1.1.0

Validates agent and synthesizer JSON outputs against the LYRA schema v1.1.0
before they are written to the audits/runs/ directory.

Usage:
  python3 audits/validate_output.py <output.json>            # Validate one file
  python3 audits/validate_output.py audits/runs/2026-03-10/  # Validate all files in dir
  python3 audits/validate_output.py --all                    # Validate all run files
  python3 audits/validate_output.py --fix <output.json>      # Report violations only (no auto-fix)

Exit codes:
  0 = all files valid
  1 = one or more violations found
"""

import json
import sys
import os
from pathlib import Path
from datetime import datetime, timezone

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema", "audit-output.schema.json")
RUNS_DIR = os.path.join(os.path.dirname(__file__), "runs")

REQUIRED_TOP_LEVEL = [
    "schema_version", "kind", "run_id", "run_metadata",
    "suite", "agent", "findings", "rollups", "next_actions"
]

REQUIRED_RUN_METADATA = ["timestamp", "branch", "environment", "tool_platform", "model"]

VALID_KIND = {"agent_output", "synthesizer_output"}
VALID_ENVIRONMENT = {"local", "ci", "staging", "production"}
VALID_SEVERITY = {"blocker", "major", "minor", "nit"}
VALID_PRIORITY = {"P0", "P1", "P2", "P3"}
VALID_TYPE = {"bug", "enhancement", "debt", "question"}
VALID_STATUS = {
    "open", "accepted", "in_progress", "fixed_pending_verify", "fixed_verified",
    "wont_fix", "deferred", "duplicate", "converted_to_enhancement"
}
VALID_CONFIDENCE = {"evidence", "inference", "speculation"}
VALID_HOOK_TYPE = {
    "code_ref", "error_text", "command", "repro_steps", "ui_path",
    "data_shape", "log_line", "config_key", "query", "artifact_ref"
}
VALID_HISTORY_EVENT = {
    "created", "repro_confirmed", "hypothesis_added", "patch_proposed",
    "patch_applied", "verification_passed", "verification_failed", "reopened",
    "deferred", "wont_fix", "linked_duplicate", "scope_changed",
    "severity_changed", "split_into_children", "converted_type", "note_added"
}
VALID_EFFORT = {"trivial", "small", "medium", "large", "epic"}

REQUIRED_FINDING_FIELDS = [
    "finding_id", "type", "category", "severity", "priority",
    "confidence", "title", "description", "proof_hooks", "impact",
    "suggested_fix", "status", "history"
]

REQUIRED_ROLLUP_KEYS = ["by_severity", "by_category", "by_type", "by_status"]


class Violation:
    def __init__(self, path: str, message: str, severity: str = "ERROR"):
        self.path = path
        self.message = message
        self.severity = severity

    def __str__(self):
        return f"  [{self.severity}] {self.path}: {self.message}"


def validate_file(filepath: str) -> list[Violation]:
    violations = []

    try:
        with open(filepath) as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        return [Violation(filepath, f"Invalid JSON: {e}")]
    except OSError as e:
        return [Violation(filepath, f"Cannot read file: {e}")]

    def v(path, msg, sev="ERROR"):
        violations.append(Violation(path, msg, sev))

    # --- Top-level required fields ---
    for field in REQUIRED_TOP_LEVEL:
        if field not in data:
            v(f"{filepath}::{field}", f"Missing required top-level field '{field}'")

    if "schema_version" in data and data["schema_version"] != "1.1.0":
        v(f"{filepath}::schema_version", f"Expected '1.1.0', got '{data['schema_version']}'")

    if "kind" in data and data["kind"] not in VALID_KIND:
        v(f"{filepath}::kind", f"Invalid kind '{data['kind']}'. Must be one of: {sorted(VALID_KIND)}")

    # --- run_metadata ---
    if "run_metadata" in data:
        rm = data["run_metadata"]
        if not isinstance(rm, dict):
            v(f"{filepath}::run_metadata", "run_metadata must be an object")
        else:
            for field in REQUIRED_RUN_METADATA:
                if field not in rm:
                    v(f"{filepath}::run_metadata.{field}", f"Missing required run_metadata field '{field}'")
            if "environment" in rm and rm["environment"] not in VALID_ENVIRONMENT:
                v(f"{filepath}::run_metadata.environment",
                  f"Invalid environment '{rm['environment']}'. Must be one of: {sorted(VALID_ENVIRONMENT)}")
            if "timestamp" in rm:
                try:
                    datetime.fromisoformat(rm["timestamp"].replace("Z", "+00:00"))
                except ValueError:
                    v(f"{filepath}::run_metadata.timestamp",
                      f"timestamp must be ISO 8601 format, got '{rm['timestamp']}'")
    # --- agent ---
    if "agent" in data:
        ag = data["agent"]
        if not isinstance(ag, dict):
            v(f"{filepath}::agent", "agent must be an object")
        else:
            for field in ("name", "role"):
                if field not in ag:
                    v(f"{filepath}::agent.{field}", f"Missing required agent field '{field}'")

    # --- coverage ---
    if "coverage" in data:
        cov = data["coverage"]
        if not isinstance(cov, dict):
            v(f"{filepath}::coverage", "coverage must be an object")
        else:
            if "files_examined" in cov and not isinstance(cov["files_examined"], list):
                v(f"{filepath}::coverage.files_examined",
                  f"files_examined must be an array, got {type(cov['files_examined']).__name__}", "WARNING")
            if "files_skipped" in cov and not isinstance(cov["files_skipped"], list):
                v(f"{filepath}::coverage.files_skipped",
                  f"files_skipped must be an array, got {type(cov['files_skipped']).__name__}", "WARNING")

    # --- findings ---
    if "findings" in data:
        findings = data["findings"]
        if not isinstance(findings, list):
            v(f"{filepath}::findings", "findings must be an array")
        else:
            for i, finding in enumerate(findings):
                fp = f"{filepath}::findings[{i}]"
                fid = finding.get("finding_id", finding.get("id", f"<index {i}>"))

                for field in REQUIRED_FINDING_FIELDS:
                    if field not in finding:
                        v(f"{fp}.{field}", f"Finding '{fid}' missing required field '{field}'")

                if "finding_id" not in finding and "id" in finding:
                    v(f"{fp}.finding_id",
                      f"Finding uses 'id' instead of 'finding_id'. Rename to 'finding_id'.")

                if "severity" in finding:
                    sev = finding["severity"]
                    if sev not in VALID_SEVERITY:
                        v(f"{fp}.severity",
                          f"Finding '{fid}' severity '{sev}' is invalid. "
                          f"Must be lowercase: {sorted(VALID_SEVERITY)}")

                if "priority" in finding and finding["priority"] not in VALID_PRIORITY:
                    v(f"{fp}.priority",
                      f"Finding '{fid}' priority '{finding['priority']}' invalid. "
                      f"Must be: {sorted(VALID_PRIORITY)}")

                if "type" in finding and finding["type"] not in VALID_TYPE:
                    v(f"{fp}.type",
                      f"Finding '{fid}' type '{finding['type']}' invalid. "
                      f"Must be: {sorted(VALID_TYPE)}")

                if "status" in finding and finding["status"] not in VALID_STATUS:
                    v(f"{fp}.status",
                      f"Finding '{fid}' status '{finding['status']}' invalid. "
                      f"Must be: {sorted(VALID_STATUS)}")

                if "confidence" in finding:
                    conf = finding["confidence"]
                    if conf not in VALID_CONFIDENCE:
                        v(f"{fp}.confidence",
                          f"Finding '{fid}' confidence '{conf}' is invalid. "
                          f"Must be lowercase: {sorted(VALID_CONFIDENCE)}")

                # proof_hooks
                if "proof_hooks" in finding:
                    hooks = finding["proof_hooks"]
                    if not isinstance(hooks, list):
                        v(f"{fp}.proof_hooks", f"Finding '{fid}' proof_hooks must be an array")
                    elif len(hooks) == 0:
                        v(f"{fp}.proof_hooks",
                          f"Finding '{fid}' proof_hooks must have at least 1 item")
                    else:
                        for j, hook in enumerate(hooks):
                            hp = f"{fp}.proof_hooks[{j}]"
                            if "hook_type" not in hook:
                                v(hp, f"Finding '{fid}' proof hook {j} missing 'hook_type'")
                            elif hook["hook_type"] not in VALID_HOOK_TYPE:
                                v(hp, f"Finding '{fid}' hook_type '{hook['hook_type']}' invalid. "
                                  f"Must be: {sorted(VALID_HOOK_TYPE)}")
                            if "summary" not in hook:
                                v(hp, f"Finding '{fid}' proof hook {j} missing 'summary'")

                if "code_refs" in finding and "proof_hooks" not in finding:
                    v(f"{fp}.code_refs",
                      f"Finding '{fid}' uses 'code_refs' instead of 'proof_hooks'. Rename field.")

                # suggested_fix
                if "suggested_fix" in finding:
                    sf = finding["suggested_fix"]
                    if isinstance(sf, str):
                        v(f"{fp}.suggested_fix",
                          f"Finding '{fid}' suggested_fix must be an object with 'approach' field, got string")
                    elif isinstance(sf, dict):
                        if "approach" not in sf:
                            v(f"{fp}.suggested_fix.approach",
                              f"Finding '{fid}' suggested_fix missing required 'approach' field")
                        if "estimated_effort" in sf and sf["estimated_effort"] not in VALID_EFFORT:
                            v(f"{fp}.suggested_fix.estimated_effort",
                              f"Finding '{fid}' estimated_effort '{sf['estimated_effort']}' invalid. "
                              f"Must be: {sorted(VALID_EFFORT)}")

                # history
                if "history" in finding:
                    hist = finding["history"]
                    if not isinstance(hist, list) or len(hist) == 0:
                        v(f"{fp}.history",
                          f"Finding '{fid}' history must be a non-empty array")
                    else:
                        for k, event in enumerate(hist):
                            ep = f"{fp}.history[{k}]"
                            for req_f in ("timestamp", "actor", "event"):
                                if req_f not in event:
                                    v(ep, f"Finding '{fid}' history event {k} missing '{req_f}'")
                            if "event" in event and event["event"] not in VALID_HISTORY_EVENT:
                                v(ep, f"Finding '{fid}' history event '{event['event']}' invalid. "
                                  f"Must be: {sorted(VALID_HISTORY_EVENT)}")

    # --- rollups ---
    if "rollups" in data:
        rollups = data["rollups"]
        if not isinstance(rollups, dict):
            v(f"{filepath}::rollups", "rollups must be an object")
        else:
            for key in REQUIRED_ROLLUP_KEYS:
                if key not in rollups:
                    v(f"{filepath}::rollups.{key}",
                      f"Missing required rollups key '{key}'")

    # --- next_actions ---
    if "next_actions" in data:
        na = data["next_actions"]
        if not isinstance(na, list):
            v(f"{filepath}::next_actions", "next_actions must be an array")
        else:
            for i, action in enumerate(na):
                ap = f"{filepath}::next_actions[{i}]"
                for req_f in ("action", "finding_id", "rationale"):
                    if req_f not in action:
                        v(ap, f"next_action[{i}] missing required field '{req_f}'")

    return violations


def collect_run_files(path: str) -> list[str]:
    """Collect all JSON run files from a path (file or directory)."""
    p = Path(path)
    if p.is_file():
        return [str(p)]
    if p.is_dir():
        return sorted(str(f) for f in p.rglob("*.json"))
    return []


def validate_all_runs() -> tuple[list[str], list[Violation]]:
    """Validate all files in audits/runs/."""
    all_files = []
    runs_path = Path(RUNS_DIR)
    if runs_path.exists():
        all_files = sorted(str(f) for f in runs_path.rglob("*.json"))
    return all_files, sum((validate_file(f) for f in all_files), [])


def main():
    args = sys.argv[1:]

    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)

    all_violations: list[Violation] = []
    all_files: list[str] = []

    if args[0] == "--all":
        all_files, all_violations = validate_all_runs()
    else:
        for arg in args:
            if arg.startswith("--"):
                continue
            files = collect_run_files(arg)
            if not files:
                print(f"WARNING: No JSON files found at '{arg}'")
                continue
            all_files.extend(files)
            for f in files:
                all_violations.extend(validate_file(f))

    if not all_files:
        print("No files to validate.")
        sys.exit(0)

    errors = [v for v in all_violations if v.severity == "ERROR"]
    warnings = [v for v in all_violations if v.severity == "WARNING"]

    print(f"LYRA Schema Validator v1.1.0")
    print(f"Validated {len(all_files)} file(s)")
    print()

    if not all_violations:
        print(f"✓ All files conform to schema v1.1.0")
        sys.exit(0)

    # Group by file
    by_file: dict[str, list[Violation]] = {}
    for viol in all_violations:
        fname = viol.path.split("::")[0]
        by_file.setdefault(fname, []).append(viol)

    for fname, viols in sorted(by_file.items()):
        errs = [v for v in viols if v.severity == "ERROR"]
        warns = [v for v in viols if v.severity == "WARNING"]
        label = "✗" if errs else "⚠"
        print(f"{label} {fname} ({len(errs)} error(s), {len(warns)} warning(s)):")
        for viol in viols:
            path_part = viol.path.split("::", 1)[1] if "::" in viol.path else ""
            print(f"    [{viol.severity}] {path_part}: {viol.message}")
        print()

    print(f"Summary: {len(errors)} error(s), {len(warnings)} warning(s) across {len(by_file)} file(s)")

    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
