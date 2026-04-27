#!/usr/bin/env python3
"""
Merge a LYRA synthesizer_output JSON into canonical audit state.

Updates:
  - audits/open_findings.json (history append + new rows + root last_updated / run_id)
  - audits/index.json (prepends synthesizer + agent runs from the same batch if missing)
  - audits/findings/<finding_id>.md for ALL findings (regenerated every ingest)

Usage:
  python3 audits/ingest_synthesizer.py <path/to/synthesized-*.json>
  python3 audits/ingest_synthesizer.py <path/to/synthesized-*.json> --allow-partial

  Default behavior is STRICT: ingest fails if any non-terminal finding in
  open_findings.json is missing from the synthesizer findings array AND is
  not listed in diff_summary.not_rereported with a reason.

  --allow-partial  Warn instead of failing on missing carry-forward findings.
                   Use only when you understand why IDs are missing.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# Non-terminal statuses that MUST be carried forward or explicitly accounted for.
NON_TERMINAL_STATUSES = frozenset(
    {"open", "accepted", "in_progress", "fixed_pending_verify"}
)

# Terminal statuses that should not be reintroduced after prune.
TERMINAL_STATUSES = frozenset(
    {"fixed_verified", "wont_fix", "duplicate", "converted_to_enhancement", "deferred"}
)


def repo_root() -> str:
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _history_key(h: dict) -> tuple:
    return (h.get("timestamp"), h.get("actor"), h.get("event"), h.get("notes"))


def _ensure_finding_defaults(f: dict) -> dict:
    out = dict(f)
    if not out.get("description"):
        out["description"] = out.get("title", "")
    if "impact" not in out:
        out["impact"] = ""
    if "suggested_fix" not in out:
        out["suggested_fix"] = {
            "approach": "See synthesizer / agent notes.",
            "affected_files": [],
            "estimated_effort": "small",
            "tests_needed": [],
        }
    return out


def _render_case_file(f: dict, synth_run_id: str) -> str:
    """Markdown case file rendered from canonical JSON. Regenerated every ingest."""
    fx = f.get("suggested_fix") or {}
    aff = fx.get("affected_files") or []
    aff_line = ", ".join(f"`{p}`" for p in aff) if aff else "—"
    hooks = f.get("proof_hooks") or []
    hook_lines = []
    for h in hooks:
        ht = h.get("hook_type", "?")
        sm = h.get("summary", "")
        fl = h.get("file", "")
        hook_lines.append(f"- **[{ht}]** {sm}")
        if fl:
            hook_lines[-1] += f"\n  - File: `{fl}`"
    hooks_block = "\n".join(hook_lines) if hook_lines else "- _(see JSON)_"
    hist = f.get("history") or []
    hist_lines = []
    for h in hist:
        entry = f"- {h.get('timestamp')} — **{h.get('actor')}** — {h.get('event')}"
        if h.get("notes"):
            entry += f": {h['notes']}"
        if h.get("from_status") and h.get("to_status"):
            entry += f" [{h['from_status']} → {h['to_status']}]"
        hist_lines.append(entry)
    history_block = "\n".join(hist_lines) if hist_lines else f"- {NOW} — **ingest_synthesizer** — created"

    sources = f.get("source_runs") or []
    sources_block = ""
    if sources:
        sources_block = "\n## Sources\n\n" + "\n".join(f"- `{s}`" for s in sources)

    return f"""# Finding: {f["finding_id"]}

> **Status:** {f.get("status", "open")} | **Severity:** {f.get("severity", "?")} | **Priority:** {f.get("priority", "?")} | **Type:** {f.get("type", "?")} | **Confidence:** {f.get("confidence", "?")}

## Title

{f.get("title", "")}

## Description

{f.get("description", "").strip()}

## Impact

{f.get("impact", "").strip() or "—"}

## Suggested fix

{fx.get("approach", "—")}

**Affected files:** {aff_line}

## Proof hooks

{hooks_block}

## History

{history_block}
{sources_block}
---
*Last canonical synthesizer run: `{synth_run_id}`*
"""


# --- Carry-forward enforcement ---


def _non_terminal_ids(findings: list) -> dict[str, str]:
    """Return {{finding_id: status}} for all non-terminal findings."""
    return {
        f["finding_id"]: f.get("status", "open")
        for f in findings
        if f.get("status", "open") in NON_TERMINAL_STATUSES and f.get("finding_id")
    }


def _synth_finding_ids(synth: dict) -> set[str]:
    out: set[str] = set()
    for sf in synth.get("findings", []) or []:
        fid = sf.get("finding_id")
        if fid:
            out.add(fid)
    return out


def _not_rereported_ids(synth: dict) -> set[str]:
    """IDs explicitly listed in diff_summary.not_rereported."""
    nr = (synth.get("diff_summary") or {}).get("not_rereported") or []
    out: set[str] = set()
    for item in nr:
        fid = item.get("finding_id") if isinstance(item, dict) else None
        if fid:
            out.add(fid)
    return out


def _check_carry_forward(
    prior_findings: list, synth: dict, *, strict: bool
) -> None:
    """Validate that every non-terminal finding is accounted for."""
    prior_non_terminal = _non_terminal_ids(prior_findings)
    if not prior_non_terminal:
        return
    synth_ids = _synth_finding_ids(synth)
    nr_ids = _not_rereported_ids(synth)
    accounted = synth_ids | nr_ids
    missing = {fid: status for fid, status in prior_non_terminal.items() if fid not in accounted}
    if not missing:
        return

    by_status: dict[str, list[str]] = {}
    for fid, status in sorted(missing.items()):
        by_status.setdefault(status, []).append(fid)

    lines = [
        f"ingest_synthesizer: synthesizer output omits {len(missing)} non-terminal "
        f"finding(s) from open_findings.json:",
    ]
    for status, fids in sorted(by_status.items()):
        lines.append(f"  [{status}] ({len(fids)}):")
        for fid in fids:
            lines.append(f"    - {fid}")
    lines.append("")
    lines.append(
        "Every non-terminal finding must appear in the synthesizer findings array "
        "OR in diff_summary.not_rereported with a reason."
    )
    lines.append(
        "To override: python3 audits/ingest_synthesizer.py <path> --allow-partial"
    )
    msg = "\n".join(lines)
    if strict:
        print(msg, file=sys.stderr)
        sys.exit(1)
    print(msg, file=sys.stderr)


# --- Duplicate enforcement ---


def _check_duplicate_canonicalization(synth: dict, *, strict: bool) -> None:
    """Reject duplicate-status rows that don't specify replaces_finding_id."""
    bad = []
    for sf in synth.get("findings", []) or []:
        if sf.get("status") == "duplicate" and not sf.get("replaces_finding_id"):
            bad.append(sf.get("finding_id", "?"))
    if not bad:
        return
    lines = [
        f"ingest_synthesizer: {len(bad)} finding(s) have status 'duplicate' but "
        "no 'replaces_finding_id' field:",
        *(f"  - {fid}" for fid in bad),
        "",
        "Duplicate findings must specify which canonical ID they collapse into.",
        "Update the synthesizer output: add replaces_finding_id to each duplicate row.",
    ]
    msg = "\n".join(lines)
    if strict:
        print(msg, file=sys.stderr)
        sys.exit(1)
    print(msg, file=sys.stderr)


# --- Index management ---


def _index_prepend_synthesizer(index_path: str, synth: dict, synth_rel_path: str) -> None:
    """If audits/index.json lacks this synthesizer run_id, prepend one row (idempotent)."""
    run_id = synth.get("run_id")
    if not run_id:
        return
    with open(index_path, encoding="utf-8") as fp:
        data = json.load(fp)
    runs = data.setdefault("runs", [])
    if any(r.get("run_id") == run_id for r in runs):
        return

    root = repo_root()
    day_folder = ""
    parts = synth_rel_path.replace("\\", "/").split("/")
    if "runs" in parts:
        i = parts.index("runs")
        if i + 1 < len(parts):
            day_folder = parts[i + 1]
    stem = run_id.removeprefix("synthesized-")
    present_suites = []
    for suite, prefix in (
        ("logic", "logic"),
        ("data", "data"),
        ("ux", "ux"),
        ("performance", "perf"),
        ("security", "security"),
        ("deploy", "deploy"),
    ):
        agent_id = f"{prefix}-{stem}"
        art = f"audits/runs/{day_folder}/{agent_id}.json"
        if day_folder and os.path.isfile(os.path.join(root, art)):
            present_suites.append(suite)

    row = {
        "run_id": run_id,
        "kind": "synthesizer_output",
        "timestamp": NOW,
        "artifact": synth_rel_path.replace("\\", "/"),
        "source_suites": present_suites or [],
    }
    data["runs"] = [row] + runs
    with open(index_path, "w", encoding="utf-8") as fp:
        json.dump(data, fp, indent=2)
        fp.write("\n")
    print(f"Prepended synthesizer row to {index_path}")


# --- Core ingest ---


def ingest(synth_path: str, *, strict: bool = True) -> None:
    root = repo_root()
    synth_path = os.path.normpath(os.path.join(root, synth_path))
    if not os.path.isfile(synth_path):
        print(f"Not found: {synth_path}", file=sys.stderr)
        sys.exit(1)

    with open(synth_path, encoding="utf-8") as fp:
        synth = json.load(fp)

    if synth.get("kind") != "synthesizer_output":
        print("JSON kind must be synthesizer_output", file=sys.stderr)
        sys.exit(1)

    open_path = os.path.join(root, "audits", "open_findings.json")
    findings_dir = os.path.join(root, "audits", "findings")
    index_path = os.path.join(root, "audits", "index.json")

    with open(open_path, encoding="utf-8") as fp:
        data = json.load(fp)

    if isinstance(data, list):
        findings = data
        data = {"findings": findings}
        key = "findings"
    else:
        key = "open_findings" if "open_findings" in data else "findings"
        findings: list = data.get(key, [])

    by_id = {f["finding_id"]: f for f in findings if f.get("finding_id")}

    # --- Validation gates (run before any mutation) ---

    _check_carry_forward(findings, synth, strict=strict)
    _check_duplicate_canonicalization(synth, strict=strict)

    # --- Merge ---

    synth_run_id = synth.get("run_id", "unknown")
    new_ids: list[str] = []
    updated_ids: list[str] = []
    status_changes: list[str] = []
    duplicates_collapsed: list[str] = []

    was_pruned = bool(data.get("prune_closed_applied"))

    for sf in synth.get("findings", []):
        fid = sf.get("finding_id")
        if not fid:
            continue

        # Handle duplicate canonicalization: remove the duplicate, keep the canonical
        replaces = sf.get("replaces_finding_id")
        if sf.get("status") == "duplicate" and replaces:
            if fid in by_id:
                findings[:] = [f for f in findings if f.get("finding_id") != fid]
                del by_id[fid]
                duplicates_collapsed.append(f"{fid} → {replaces}")
            continue

        hist_incoming = sf.get("history") or []

        if fid in by_id:
            cur = by_id[fid]
            old_status = cur.get("status")
            new_status = sf.get("status")

            # Append new history entries (deduplicated)
            seen = {_history_key(h) for h in cur.get("history", [])}
            for h in hist_incoming:
                if _history_key(h) not in seen:
                    cur.setdefault("history", []).append(h)
                    seen.add(_history_key(h))

            # Emit structured status_change history when status actually changes
            if new_status and new_status != old_status:
                status_entry = {
                    "timestamp": NOW,
                    "actor": "ingest_synthesizer",
                    "event": "status_change",
                    "from_status": old_status,
                    "to_status": new_status,
                    "source_run": synth_run_id,
                    "notes": f"Status changed by synthesizer {synth_run_id}",
                }
                cur.setdefault("history", []).append(status_entry)
                status_changes.append(f"{fid}: {old_status} → {new_status}")

            # Refresh ledger fields
            for field in (
                "status", "title", "description", "category",
                "severity", "priority", "type", "confidence", "impact",
            ):
                if field in sf and sf[field] is not None and sf[field] != "":
                    cur[field] = sf[field]
            if sf.get("proof_hooks"):
                cur["proof_hooks"] = sf["proof_hooks"]
            if sf.get("suggested_fix") is not None:
                cur["suggested_fix"] = sf["suggested_fix"]
            updated_ids.append(fid)
        else:
            nf = _ensure_finding_defaults(sf)
            findings.append(nf)
            by_id[fid] = nf
            new_ids.append(fid)

    # --- Prune integrity ---
    if was_pruned:
        reintroduced = [
            fid for fid in new_ids
            if by_id[fid].get("status") in TERMINAL_STATUSES
        ]
        if reintroduced:
            data.pop("prune_closed_applied", None)
            print(
                f"WARNING: Ingest reintroduced {len(reintroduced)} terminal finding(s) "
                f"after prune. Cleared prune_closed_applied. IDs: {reintroduced}",
                file=sys.stderr,
            )

    data["last_updated"] = NOW
    data["run_id"] = synth_run_id
    data[key] = findings
    with open(open_path, "w", encoding="utf-8") as fp:
        json.dump(data, fp, indent=2)
        fp.write("\n")

    # --- Regenerate ALL case files from canonical JSON ---
    os.makedirs(findings_dir, exist_ok=True)
    regen_count = 0
    for f in findings:
        fid = f.get("finding_id")
        if not fid:
            continue
        md_path = os.path.join(findings_dir, f"{fid}.md")
        body = _render_case_file(f, synth_run_id)
        with open(md_path, "w", encoding="utf-8") as fp:
            fp.write(body)
        regen_count += 1

    # --- Index ---
    _index_prepend_synthesizer(
        index_path, synth, os.path.relpath(synth_path, root),
    )

    # --- Summary ---
    print(f"Merged {len(synth.get('findings', []))} synthesizer finding row(s).")
    print(f"  New:      {len(new_ids)}")
    print(f"  Updated:  {len(updated_ids)}")
    if status_changes:
        print(f"  Status transitions: {len(status_changes)}")
        for sc in status_changes:
            print(f"    {sc}")
    if duplicates_collapsed:
        print(f"  Duplicates collapsed: {len(duplicates_collapsed)}")
        for dc in duplicates_collapsed:
            print(f"    {dc}")
    print(f"  Case files regenerated: {regen_count}")
    print(f"Updated {open_path} run_id={synth_run_id}")


def main() -> None:
    argv = sys.argv[1:]

    # Default is strict. --allow-partial opts out.
    strict = True
    if argv and argv[-1] == "--allow-partial":
        strict = False
        argv = argv[:-1]
    # Legacy compat: --strict is accepted but now the default (no-op)
    if argv and argv[-1] == "--strict":
        argv = argv[:-1]

    if len(argv) != 1:
        print(__doc__.strip(), file=sys.stderr)
        sys.exit(1)
    ingest(argv[0], strict=strict)


if __name__ == "__main__":
    main()
