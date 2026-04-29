#!/usr/bin/env python3
"""
LYRA Session Runner v2.0

One script for the entire audit-fix-ship cycle. Reduces cognitive load to:
  1. Run this script
  2. Do what it says
  3. Run it again when done
  4. Ship when it says you can

Usage:
  python3 audits/session.py                  # Show what to do next
  python3 audits/session.py triage           # Show prioritized fix list
  python3 audits/session.py fix <finding_id> # Mark a finding as in-progress
  python3 audits/session.py done <finding_id> [commit_sha]  # Mark fix applied
  python3 audits/session.py skip <finding_id> [reason]      # Defer a finding
  python3 audits/session.py reaudit          # Show which agents to re-run
  python3 audits/session.py preflight        # Run lint/typecheck/test/build → audits/artifacts/_run_/
  python3 audits/session.py audit-batch      # Preflight + re-audit plan + one batched checklist file
  python3 audits/session.py audit-batch --full   # Same, but all 6 agents + monorepo scope (no WIP required)
  python3 audits/session.py audit-batch --all    # Core + full visual lane in one checklist (shared run_id stem)
  python3 audits/session.py audit-batch --visual # Visual lane only (same as visual-batch)
  python3 audits/session.py audit-batch --lane cohesion --all  # Combined batch; --lane limits visual agents
  python3 audits/session.py visual-batch [--lane NAME]  # Visual-only batched checklist
  python3 audits/session.py audit-batch --skip-preflight  # Plan + checklist only (reuse last artifacts)
  python3 audits/session.py cohesion           # Latest visual cohesion score + delta vs prior run
  python3 audits/session.py canship --include-visual  # Count visual-suite blockers/questions toward ship gate
  python3 audits/session.py ingest-synth audits/runs/<date>/synthesized-<id>.json  # Merge synth JSON → canonical state (strict; auto-fills not_rereported / duplicate replaces unless --no-auto-fill)
  python3 audits/session.py ingest-synth audits/runs/<date>/synthesized-<id>.json --allow-partial  # Warn instead of fail on missing carry-forward
  python3 audits/session.py ingest-synth audits/runs/<date>/synthesized-<id>.json --no-auto-fill  # Require hand-authored carry-forward and duplicate canonical IDs
  python3 audits/session.py verify <finding_id>  # Mark re-audit passed (fixed_pending_verify -> fixed_verified)
  python3 audits/session.py prune-closed --dry-run  # Drop terminal findings from open_findings.json (case .md kept)
  python3 audits/session.py status           # Full dashboard
  python3 audits/session.py canship          # Am I ready to deploy?
  python3 audits/session.py decide <finding_id> <decision>  # Answer a question finding
  python3 audits/session.py init                            # Generate audits/project.toml with auto-detected paths
  python3 audits/session.py visual-batch [--lane NAME] [--skip-preflight] [--full]  # Visual-only batched checklist
  python3 audits/session.py audit-batch --all [--lane NAME]  # Core + visual in one checklist
  python3 audits/session.py cohesion           # Latest visual cohesion score + delta
  python3 audits/session.py canship --include-visual  # Include visual-suite rows in ship gate
"""

import json
import sys
import os
import shutil
import subprocess
from datetime import datetime, timezone
from collections import defaultdict

# --- Config ---

OPEN_FINDINGS = "audits/open_findings.json"
INDEX = "audits/index.json"
FINDINGS_DIR = "audits/findings"
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# Priority sort order (lower = more urgent)
PRIORITY_ORDER = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
SEVERITY_ORDER = {"blocker": 0, "major": 1, "minor": 2, "nit": 3}
EFFORT_ORDER = {"trivial": 0, "small": 1, "medium": 2, "large": 3, "epic": 4}
CONFIDENCE_ORDER = {"evidence": 0, "inference": 1, "speculation": 2}

# Agent mapping: which agent covers which categories
CATEGORY_TO_AGENT = {
    "null-ref": "logic", "type-error": "logic", "race-condition": "logic",
    "dead-code": "logic", "error-handling": "logic", "async-bug": "logic",
    "runtime-error": "logic", "runtime_logic": "logic",
    "schema-mismatch": "data", "missing-rls": "data", "constraint-violation": "data",
    "migration-gap": "data", "orphaned-data": "data", "type-drift": "data",
    "validation-gap": "data",
    "copy-mismatch": "ux", "missing-state": "ux", "broken-flow": "ux",
    "a11y-gap": "ux", "nav-dead-end": "ux", "inconsistent-label": "ux",
    "missing-boundary": "ux",
    "n-plus-one": "performance", "missing-index": "performance",
    "bundle-size": "performance", "render-waste": "performance",
    "api-cost": "performance", "cache-miss": "performance",
    "auth-bypass": "security", "xss": "security", "injection": "security",
    "secrets-exposure": "security", "cors-misconfiguration": "security",
    "data-leakage": "security", "missing-validation": "security",
    "build-config": "deploy", "ci-gap": "deploy",
    "missing-error-boundary": "deploy", "logging-gap": "deploy",
    "env-management": "deploy", "deploy-risk": "deploy",
}

AGENT_PROMPTS = {
    "logic": "audits/prompts/agent-logic.md",
    "data": "audits/prompts/agent-data.md",
    "ux": "audits/prompts/agent-ux.md",
    "performance": "audits/prompts/agent-performance.md",
    "security": "audits/prompts/agent-security.md",
    "deploy": "audits/prompts/agent-deploy.md",
}

# Stable order for batched checklists and terminal output
AGENT_ORDER = ["logic", "data", "ux", "performance", "security", "deploy"]

# Removed from open_findings.json by prune-closed (history remains in audits/findings/*.md and run JSON).
PRUNE_CLOSED_STATUSES = frozenset(
    {"fixed_verified", "wont_fix", "duplicate", "converted_to_enhancement"}
)

# Default trigger map — used when project.toml is absent.
# Maps path prefixes to which agents should re-run when those paths change.
# When project.toml exists, this is rebuilt from [paths.*] sections so it
# always matches the actual project layout.
DEFAULT_TRIGGER_MAP = {
    "src/": ["logic", "ux"],
    "lib/": ["logic"],
    "app/": ["logic", "ux"],
    "pages/": ["ux", "logic"],
    "server/": ["logic", "data", "security"],
    "api/": ["logic", "data", "security"],
    "backend/": ["logic", "data", "security"],
    "frontend/": ["logic", "ux", "performance"],
    "apps/": ["logic", "ux", "data"],
    "packages/": ["logic", "performance"],
    "services/": ["logic", "data"],
    "supabase/migrations/": ["data", "security"],
    "supabase/": ["data"],
    "netlify/functions/": ["logic", "data", "security"],
    "infra/": ["deploy", "security"],
    ".env": ["security", "deploy"],
    "package.json": ["deploy", "performance"],
    "vite.config": ["deploy", "performance"],
    "next.config": ["deploy", "performance"],
    "netlify.toml": ["deploy"],
    ".github/workflows/": ["deploy"],
    "tsconfig": ["deploy"],
    "docker": ["deploy"],
    "Dockerfile": ["deploy"],
}

# --- Visual audit suite (LYRA visual lane; suite JSON field "visual") ---

VISUAL_AGENT_PROMPTS = {
    "tokens": "audits/prompts/visual-tokens.md",
    "typography": "audits/prompts/visual-typography.md",
    "layout": "audits/prompts/visual-layout.md",
    "components": "audits/prompts/visual-components.md",
    "color": "audits/prompts/visual-color.md",
    "polish": "audits/prompts/visual-polish.md",
}
VISUAL_SYNTH_PROMPT = "audits/prompts/visual-synthesizer.md"

VISUAL_AGENT_ORDER = ["tokens", "typography", "layout", "components", "color", "polish"]

VISUAL_LANES = {
    "cohesion": ["components", "color"],
    "spacing": ["tokens", "layout"],
    "headings": ["typography", "tokens"],
    "polish": ["polish", "components"],
    "all": VISUAL_AGENT_ORDER,
}

# Visual prompt categories / prefixes → primary visual agent (for verification routing).
VISUAL_CATEGORY_TO_AGENT = {
    "color-system": "tokens",
    "spacing-system": "tokens",
    "type-scale": "tokens",
    "elevation-system": "tokens",
    "token-governance": "tokens",
    "heading-hierarchy": "typography",
    "font-size-drift": "typography",
    "weight-inconsistency": "typography",
    "line-height": "typography",
    "text-color-hierarchy": "typography",
    "special-typography": "typography",
    "page-structure": "layout",
    "section-spacing": "layout",
    "component-spacing": "layout",
    "grid-alignment": "layout",
    "whitespace": "layout",
    "responsive": "layout",
    "container-width": "layout",
    "button-consistency": "components",
    "card-consistency": "components",
    "form-consistency": "components",
    "modal-consistency": "components",
    "nav-consistency": "components",
    "feedback-consistency": "components",
    "data-display": "components",
    "icon-consistency": "components",
    "palette-drift": "color",
    "semantic-color": "color",
    "surface-hierarchy": "color",
    "contrast-ratio": "color",
    "border-color": "color",
    "state-color": "color",
    "dark-mode": "color",
    "hover-state": "polish",
    "focus-indicator": "polish",
    "active-state": "polish",
    "transition-timing": "polish",
    "shadow-consistency": "polish",
    "border-radius": "polish",
    "loading-pattern": "polish",
    "micro-interaction": "polish",
    "visual-noise": "polish",
}

# Path substring → visual agents to re-run when expanding triggers (verification + --all only).
VISUAL_TRIGGER_MAP = {
    "src/components/": ["components", "color", "polish"],
    "src/pages/": ["layout", "typography", "components", "color"],
    "src/styles/": ["tokens", "color", "polish"],
    "src/index.css": ["tokens", "color"],
    "tailwind.config": ["tokens", "color"],
    "postcss.config": ["tokens"],
    "stylelint.config": ["tokens", "color"],
    "eslint.config": ["tokens"],
}

COHESION_JSON = "audits/cohesion.json"

# --- Project config ---

def _try_load_toml(path):
    """Load a TOML file. Uses tomllib (3.11+) or falls back to a minimal parser."""
    try:
        import tomllib
    except ImportError:
        try:
            import tomli as tomllib  # pip install tomli for <3.11
        except ImportError:
            return None
    if not os.path.isfile(path):
        return None
    with open(path, "rb") as f:
        return tomllib.load(f)


def load_project_config():
    """Load audits/project.toml from repo root. Returns dict or None."""
    root = repo_root()
    for candidate in ("audits/project.toml", "lyra.toml"):
        cfg = _try_load_toml(os.path.join(root, candidate))
        if cfg is not None:
            return cfg
    return None


def build_trigger_map(config):
    """Build trigger map from project.toml [paths.*] sections, or use defaults."""
    if config is None:
        return DEFAULT_TRIGGER_MAP
    paths = config.get("paths", {})
    if not paths:
        return DEFAULT_TRIGGER_MAP
    tmap = {}
    for agent_name, agent_paths in paths.items():
        if not isinstance(agent_paths, dict):
            continue
        for _key, val in agent_paths.items():
            entries = val if isinstance(val, list) else [val]
            for entry in entries:
                # Strip trailing glob for prefix matching
                prefix = entry.rstrip("*").rstrip("/")
                if prefix:
                    existing = tmap.get(prefix, [])
                    if agent_name not in existing:
                        existing.append(agent_name)
                    tmap[prefix] = existing
    # Merge with defaults for common config files
    for key in (".env", "package.json", "tsconfig", ".github/workflows/",
                "docker", "Dockerfile", "netlify.toml"):
        if key not in tmap:
            tmap[key] = DEFAULT_TRIGGER_MAP.get(key, ["deploy"])
    return tmap


def get_agent_paths(config, agent_name):
    """Return the list of paths for a given agent from project.toml, or empty list."""
    if config is None:
        return []
    paths = config.get("paths", {}).get(agent_name, {})
    result = []
    for _key, val in paths.items():
        if isinstance(val, list):
            result.extend(val)
        elif isinstance(val, str) and val:
            result.append(val)
    return result


def get_preflight_config(config):
    """Return preflight commands + cwd from project.toml, or detect defaults."""
    defaults = {
        "lint": None,
        "typecheck": None,
        "test": None,
        "build": None,
        "bundle_stats": None,
        "cwd": "",
    }
    if config and "preflight" in config:
        pf = config["preflight"]
        for key in ("lint", "typecheck", "test", "build", "bundle_stats", "cwd"):
            if key in pf and pf[key]:
                defaults[key] = pf[key]
        if not defaults["bundle_stats"] and defaults["build"]:
            defaults["bundle_stats"] = defaults["build"]
        return defaults

    # Auto-detect: find the first directory with a package.json
    root = repo_root()
    # Check for apps/dashboard (Turbo monorepo pattern)
    dash = os.path.join(root, "apps", "dashboard")
    if os.path.isdir(dash) and os.path.isfile(os.path.join(dash, "package.json")):
        pkg = "pnpm" if os.path.isfile(os.path.join(root, "pnpm-lock.yaml")) else "npm"
        defaults["cwd"] = dash
        for key in ("lint", "typecheck", "test", "build"):
            defaults[key] = f"{pkg} run {key}"
        defaults["bundle_stats"] = f"{pkg} run build"
        return defaults
    # Check for frontend/ subdirectory
    fe = os.path.join(root, "frontend")
    if os.path.isdir(fe) and os.path.isfile(os.path.join(fe, "package.json")):
        pkg = "pnpm" if os.path.isfile(os.path.join(root, "pnpm-lock.yaml")) else "npm"
        defaults["cwd"] = fe
        for key in ("lint", "typecheck", "test", "build"):
            defaults[key] = f"{pkg} run {key}"
        defaults["bundle_stats"] = f"{pkg} run build"
        return defaults
    # Fallback: repo root
    pkg = "pnpm" if os.path.isfile(os.path.join(root, "pnpm-lock.yaml")) else "npm"
    for key in ("lint", "typecheck", "test", "build"):
        defaults[key] = f"{pkg} run {key}"
    defaults["bundle_stats"] = f"{pkg} run build"
    return defaults


# --- Helpers ---

def load_findings():
    if not os.path.exists(OPEN_FINDINGS):
        return [], {}
    with open(OPEN_FINDINGS) as f:
        data = json.load(f)
    findings = data.get("open_findings", data.get("findings", []))
    return findings, data


def save_findings(data, findings):
    key = "open_findings" if "open_findings" in data else "findings"
    data[key] = findings
    data["last_updated"] = NOW
    with open(OPEN_FINDINGS, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def sort_key(f):
    """Sort findings by: priority -> severity -> confidence -> effort (all ascending = most urgent first)."""
    fix = f.get("suggested_fix", {}) if isinstance(f.get("suggested_fix"), dict) else {}
    return (
        PRIORITY_ORDER.get(f.get("priority", "P3"), 9),
        SEVERITY_ORDER.get(f.get("severity", "nit"), 9),
        CONFIDENCE_ORDER.get(f.get("confidence", "speculation"), 9),
        EFFORT_ORDER.get(fix.get("estimated_effort", "epic"), 9),
    )


def actionable(f):
    """Is this finding something to work on right now?"""
    return f.get("status") in ("open", "accepted")


def in_progress(f):
    return f.get("status") == "in_progress"


def is_question(f):
    return f.get("type") == "question"


def is_open_question(f):
    return is_question(f) and f.get("status") == "open"


def is_blocker(f):
    return f.get("severity") == "blocker" and f.get("status") in ("open", "accepted", "in_progress")


def effort_str(f):
    fix = f.get("suggested_fix", {}) if isinstance(f.get("suggested_fix"), dict) else {}
    return fix.get("estimated_effort", "?")


def affected_files(f):
    fix = f.get("suggested_fix", {}) if isinstance(f.get("suggested_fix"), dict) else {}
    return fix.get("affected_files", [])


def agent_for_finding(f):
    cat = f.get("category", "")
    # Try exact match, then prefix match
    if cat in CATEGORY_TO_AGENT:
        return CATEGORY_TO_AGENT[cat]
    for key in CATEGORY_TO_AGENT:
        if key in cat or cat in key:
            return CATEGORY_TO_AGENT[key]
    return "logic"  # default


def is_visual_finding(f):
    """True if this row belongs to the visual audit suite (ledger or category)."""
    if f.get("suite") == "visual":
        return True
    cat = (f.get("category") or "").lower()
    for key in VISUAL_CATEGORY_TO_AGENT:
        k = key.lower()
        if k in cat or cat in k:
            return True
    return False


def visual_primary_agent_for_finding(f):
    """Return one visual agent key for routing re-audits, or None if not a visual row."""
    if not is_visual_finding(f):
        return None
    cat = (f.get("category") or "").lower()
    for key, agent in VISUAL_CATEGORY_TO_AGENT.items():
        k = key.lower()
        if k in cat or cat in k:
            return agent
    return "components"


def ordered_visual_agents(agent_set):
    return [a for a in VISUAL_AGENT_ORDER if a in agent_set]


def expand_visual_agents_from_paths(paths):
    out = set()
    for tf in paths or []:
        for pattern, agents in VISUAL_TRIGGER_MAP.items():
            if pattern in tf:
                out.update(agents)
    return out


def resolve_visual_lane(lane):
    lane_key = (lane or "all").lower()
    if lane_key not in VISUAL_LANES:
        print(
            f"Unknown --lane {lane!r}; valid: {', '.join(sorted(VISUAL_LANES))}",
            file=sys.stderr,
        )
        sys.exit(1)
    return ordered_visual_agents(set(VISUAL_LANES[lane_key]))


def default_visual_focus_paths():
    """Glob hints for visual audits: project.toml [paths.visual] plus common UI roots."""
    root = repo_root()
    paths = []
    config = load_project_config()
    if config:
        paths.extend(get_agent_paths(config, "visual"))
    seen = set(paths)
    extras = [
        "src/**",
        "tailwind.config.ts",
        "tailwind.config.js",
        "tailwind.config.mjs",
        "vite.config.ts",
        "stylelint.config.cjs",
        "eslint.config.js",
    ]
    for e in extras:
        if e in seen:
            continue
        if "**" in e:
            base = e.split("**")[0].rstrip("/") or "src"
            if base == "src" and os.path.isdir(os.path.join(root, "src")):
                paths.append(e)
                seen.add(e)
            elif base != "src" and os.path.isdir(os.path.join(root, base)):
                paths.append(e)
                seen.add(e)
        elif os.path.isfile(os.path.join(root, e)):
            paths.append(e)
            seen.add(e)
    if not paths:
        paths = ["src/**"]
    return paths


def full_scope_visual_focus_paths():
    """Monorepo-friendly visual focus paths (probes common trees)."""
    root = repo_root()
    out = list(dict.fromkeys(default_visual_focus_paths()))
    for name in ("frontend", "apps"):
        d = os.path.join(root, name)
        if os.path.isdir(d):
            out.append(f"{name}/**")
    return out


def add_history(f, event, notes, commit=None):
    history = f.setdefault("history", [])
    entry = {"timestamp": NOW, "actor": "solo-dev", "event": event, "notes": notes}
    if commit:
        entry["commit"] = commit
    history.append(entry)


def repo_root():
    """Repo root (parent of audits/)."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def git_changed_paths():
    """Paths changed vs HEAD. Empty if not a git checkout or on error."""
    root = repo_root()
    try:
        r = subprocess.run(
            ["git", "diff", "--name-only", "HEAD"],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if r.returncode != 0:
            return []
        return [line.strip() for line in r.stdout.splitlines() if line.strip()]
    except (OSError, subprocess.TimeoutExpired, FileNotFoundError):
        return []


def full_scope_focus_paths():
    """
    Globs for audit-batch --full: probe repo root so Lane (backend/, frontend/) and
    generic monorepos (apps/, packages/) both get real trees, not only absent paths.
    """
    root = repo_root()
    dir_globs = []
    for name in (
        "backend",
        "frontend",
        "apps",
        "packages",
        "services",
        "supabase",
        "repair_engine",
        "infra",
    ):
        if os.path.isdir(os.path.join(root, name)):
            dir_globs.append(f"{name}/**")

    root_files = [
        "package.json",
        "package-lock.json",
        "pnpm-lock.yaml",
        "pnpm-workspace.yaml",
        "turbo.json",
    ]
    touched = dir_globs + [f for f in root_files if os.path.isfile(os.path.join(root, f))]
    gh = os.path.join(root, ".github", "workflows")
    if os.path.isdir(gh):
        touched.append(".github/workflows/**")
    return touched


def collect_reaudit_plan(
    full_scope=False,
    *,
    suite_filter="core",
    expand_visual_path_triggers=False,
    lane="all",
):
    """
    full_scope: all six core agents + monorepo path hints (deep exploratory audit).

    Otherwise (verification / default reaudit): only findings in status
    ``fixed_pending_verify``. Paths come from those findings' ``affected_files`` only
    (no ``in_progress``, no git diff vs HEAD). Trigger map still expands which agents
    should review touched paths.

    suite_filter: ``core`` | ``visual`` | ``all``. Visual agents are intersected with
    ``--lane`` (see ``VISUAL_LANES``). When ``expand_visual_path_triggers`` is True
    (``audit-batch --all`` in verification mode), ``VISUAL_TRIGGER_MAP`` also adds
    visual agents for UI-ish paths among affected files.
    """
    lane_agents = resolve_visual_lane(lane)

    if full_scope:
        if suite_filter == "visual":
            return {
                "touched_files": full_scope_visual_focus_paths(),
                "agents_needed": [],
                "pending_verify": [],
                "has_pending_verify": False,
                "full_scope": True,
                "visual_agents_needed": list(lane_agents),
                "pending_verify_core": [],
                "pending_verify_visual": [],
                "visual_focus_paths": full_scope_visual_focus_paths(),
            }
        touched = full_scope_focus_paths()
        out = {
            "touched_files": touched,
            "agents_needed": [a for a in AGENT_ORDER if a in AGENT_PROMPTS],
            "pending_verify": [],
            "has_pending_verify": False,
            "full_scope": True,
            "visual_agents_needed": list(lane_agents) if suite_filter == "all" else [],
            "pending_verify_core": [],
            "pending_verify_visual": [],
            "visual_focus_paths": full_scope_visual_focus_paths() if suite_filter == "all" else [],
        }
        return out

    findings, _ = load_findings()
    pending = [f for f in findings if f.get("status") == "fixed_pending_verify"]

    vf_default = default_visual_focus_paths()

    if not pending:
        empty = {
            "touched_files": [],
            "agents_needed": [],
            "pending_verify": [],
            "has_pending_verify": False,
            "full_scope": False,
            "visual_agents_needed": [],
            "pending_verify_core": [],
            "pending_verify_visual": [],
            "visual_focus_paths": vf_default,
        }
        if suite_filter == "visual":
            empty["visual_agents_needed"] = list(lane_agents)
            empty["touched_files"] = vf_default
        elif suite_filter == "all":
            empty["visual_agents_needed"] = list(lane_agents)
            empty["agents_needed"] = [a for a in AGENT_ORDER if a in AGENT_PROMPTS]
            empty["touched_files"] = list(
                dict.fromkeys(full_scope_focus_paths() + vf_default)
            )
        return empty

    touched_files = set()
    agents_needed = set()
    for f in pending:
        for path in affected_files(f):
            if path:
                touched_files.add(path)
        if suite_filter != "visual":
            agents_needed.add(agent_for_finding(f))

    config = load_project_config()
    trigger_map = build_trigger_map(config)

    if suite_filter != "visual":
        for tf in list(touched_files):
            for pattern, agents in trigger_map.items():
                if pattern in tf:
                    for a in agents:
                        agents_needed.add(a)

    agents_sorted = [a for a in AGENT_ORDER if a in agents_needed]
    for a in sorted(agents_needed):
        if a not in agents_sorted:
            agents_sorted.append(a)

    pending_verify = [
        {"finding_id": f["finding_id"], "title": f.get("title", "")}
        for f in sorted(pending, key=lambda x: x.get("finding_id", ""))
    ]
    pending_verify_core = [
        {"finding_id": f["finding_id"], "title": f.get("title", "")}
        for f in sorted(pending, key=lambda x: x.get("finding_id", ""))
        if not is_visual_finding(f)
    ]
    pending_verify_visual = [
        {"finding_id": f["finding_id"], "title": f.get("title", "")}
        for f in sorted(pending, key=lambda x: x.get("finding_id", ""))
        if is_visual_finding(f)
    ]

    visual_needed = set()
    if suite_filter in ("all", "visual"):
        for f in pending:
            va = visual_primary_agent_for_finding(f)
            if va:
                visual_needed.add(va)
        if expand_visual_path_triggers or suite_filter == "visual":
            visual_needed.update(expand_visual_agents_from_paths(sorted(touched_files)))
        visual_sorted = [a for a in lane_agents if a in visual_needed]
        if not visual_sorted and suite_filter == "visual":
            visual_sorted = list(lane_agents)
    else:
        visual_sorted = []

    return {
        "touched_files": sorted(touched_files),
        "agents_needed": agents_sorted,
        "pending_verify": pending_verify,
        "has_pending_verify": True,
        "full_scope": False,
        "visual_agents_needed": visual_sorted,
        "pending_verify_core": pending_verify_core,
        "pending_verify_visual": pending_verify_visual,
        "visual_focus_paths": vf_default,
    }


def cmd_preflight():
    """Run lint, typecheck, test, build into audits/artifacts/_run_/."""
    root = repo_root()
    art = os.path.join(root, "audits", "artifacts", "_run_")
    os.makedirs(art, exist_ok=True)
    config = load_project_config()
    pf = get_preflight_config(config)
    cwd = pf["cwd"] if pf["cwd"] else root

    steps = [
        ("lint", pf["lint"]),
        ("typecheck", pf["typecheck"]),
        ("tests", pf["test"]),
        ("build", pf["build"]),
        ("bundle-stats", pf.get("bundle_stats")),
    ]
    print(f"Preflight ({cwd}) → audits/artifacts/_run_/")
    print("=" * 50)
    for name, cmd_str in steps:
        log = os.path.join(art, f"{name}.txt")
        if not cmd_str:
            if name == "bundle-stats":
                with open(log, "w", encoding="utf-8") as fp:
                    fp.write("Bundle stats command not configured. Set [preflight].bundle_stats in audits/project.toml.\n")
                print(f"  {name}: skipped (not configured)  → {log}")
                continue
            print(f"  {name}: skipped (not configured)")
            continue
        try:
            print(f"  {name}: running (output → {log}) …", flush=True)
            with open(log, "w", encoding="utf-8") as fp:
                p = subprocess.run(
                    cmd_str,
                    shell=True,
                    cwd=cwd,
                    stdout=fp,
                    stderr=subprocess.STDOUT,
                    timeout=900,
                )
            status = "ok" if p.returncode == 0 else f"exit {p.returncode}"
            print(f"  {name}: {status}  → {log}")
        except (OSError, subprocess.TimeoutExpired) as e:
            print(f"  {name}: FAILED ({e})  → {log}")


def cmd_audit_batch(skip_preflight=False, full_scope=False, suite_filter="core", lane="all"):
    """
    One-shot: optional preflight, plan, and one markdown checklist for an LLM session.

    suite_filter: ``core`` (default), ``visual`` (visual-only), ``all`` (core + visual).
    ``lane`` limits which visual agents run (``cohesion``, ``spacing``, ``headings``, ``polish``, ``all``).

    Without ``--full``: **verification** for core; visual lane uses pending rows + path triggers
    when ``suite_filter`` is ``all``, or full lane when ``visual``.

    With ``--full``: exploratory pass; use ``--all`` for core + visual monorepo scope.
    """
    root = repo_root()
    include_core = suite_filter in ("core", "all")
    include_visual = suite_filter in ("visual", "all")

    if not skip_preflight:
        cmd_preflight()
        print()

    expand_visual = suite_filter == "all" and not full_scope
    plan = collect_reaudit_plan(
        full_scope=full_scope,
        suite_filter=suite_filter,
        expand_visual_path_triggers=expand_visual,
        lane=lane,
    )
    touched = plan["touched_files"]
    agents = plan["agents_needed"]
    visual_agents = plan.get("visual_agents_needed") or []
    pending_rows = plan.get("pending_verify") or []
    pending_core = plan.get("pending_verify_core") or []
    pending_visual = plan.get("pending_verify_visual") or []
    vf_paths = plan.get("visual_focus_paths") or default_visual_focus_paths()

    if include_core and not agents and not full_scope:
        if not (include_visual and visual_agents):
            print("audit-batch: No fixed_pending_verify findings (verification batch is empty).")
            print("  Run: python3 audits/session.py audit-batch --full")
            print("  Or: python3 audits/session.py visual-batch   # visual lane without core queue")
            print("  Or after fixing: python3 audits/session.py done <finding_id> [commit]")
            return

    batch_dir = os.path.join(root, "audits", "artifacts", "_batch")
    os.makedirs(batch_dir, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    batch_prefix = "visual-batch" if suite_filter == "visual" else "audit-batch"
    path_out = os.path.join(batch_dir, f"{batch_prefix}-{stamp}.md")
    latest = os.path.join(batch_dir, "LATEST.md")

    run_ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    lane_note = f" — visual lane `{lane}`" if include_visual else ""
    if suite_filter == "core":
        scope_label = ("full monorepo" if full_scope else "verification (fixed_pending_verify only)")

    elif suite_filter == "visual":
        scope_label = (
            "full visual exploratory" + lane_note if full_scope else "visual lane" + lane_note
        )
    else:
        if full_scope:
            scope_label = "full monorepo + visual" + lane_note
        elif plan.get("has_pending_verify"):
            scope_label = "core verification + visual" + lane_note
        else:
            scope_label = "exploratory core + visual (no fixed_pending_verify queue)" + lane_note

    lines = [
        "# LYRA audit batch",
        "",
        f"- Generated: `{stamp}` (UTC)",
        f"- Scope: **{scope_label}**",
        "",
        "## Preflight artifacts",
        "",
        "Read these in agents that ask for them:",
        "",
        "- `audits/artifacts/_run_/lint.txt`",
        "- `audits/artifacts/_run_/typecheck.txt`",
        "- `audits/artifacts/_run_/tests.txt`",
        "- `audits/artifacts/_run_/build.txt`",
        "- `audits/artifacts/_run_/bundle-stats.txt`",
        "",
        "(If you used `--skip-preflight`, re-run `python3 audits/session.py preflight` first.)",
        "",
    ]

    lines.append("## Focus paths")
    lines.append("")
    if include_core:
        lines.append("### Core / monorepo")
        lines.append("")
        if touched:
            for p in touched:
                lines.append(f"- `{p}`")
        else:
            lines.append("- _(none — use repo-wide prompts)_")
    if include_visual:
        lines.append("")
        lines.append("### Visual lane (UI, tokens, styles)")
        lines.append("")
        for p in vf_paths:
            lines.append(f"- `{p}`")

    if pending_rows and not full_scope:
        verify_intro = [
            "",
            "Synthesizer output must include **every** `finding_id` below with an explicit "
            "verification outcome: `fixed_verified` if evidence confirms the fix, or `open` "
            "(or `accepted`) if not, each with non-empty `proof_hooks`. Carry forward all other "
            "non-terminal rows from `audits/open_findings.json` unchanged unless this pass "
            "updates them.",
            "",
        ]
        if suite_filter == "all" and (pending_core or pending_visual):
            if pending_core:
                lines.extend(
                    ["", "## Findings to verify — core suite (mandatory)", ""] + verify_intro
                )
                for row in pending_core:
                    lines.append(f"- `{row.get('finding_id', '')}` — {row.get('title', '')}")
            if pending_visual:
                lines.extend(
                    ["", "## Findings to verify — visual suite (mandatory)", ""] + verify_intro
                )
                for row in pending_visual:
                    lines.append(f"- `{row.get('finding_id', '')}` — {row.get('title', '')}")
        else:
            lines.extend(["", "## Findings to verify (mandatory)", ""] + verify_intro)
            for row in pending_rows:
                lines.append(f"- `{row.get('finding_id', '')}` — {row.get('title', '')}")

    run_id_parts = []
    if include_core and (agents or full_scope):
        run_id_parts.append(f"`logic-{run_ts}` … `deploy-{run_ts}`")
    if include_visual and visual_agents:
        slug_a = f"visual-{visual_agents[0]}"
        slug_b = f"visual-{visual_agents[-1]}"
        run_id_parts.append(f"`{slug_a}-{run_ts}` … `{slug_b}-{run_ts}`")
    run_id_line = ", ".join(run_id_parts) if run_id_parts else f"`(suite-specific)-{run_ts}`"
    synth_bits = []
    if include_core and agents:
        synth_bits.append(f"`synthesized-{run_ts}.json`")
    if include_visual and visual_agents:
        synth_bits.append(f"`visual-synthesized-{run_ts}.json`")
    synth_names = " and ".join(synth_bits) if synth_bits else "_(none)_"

    lines.extend(
        [
            "",
            "## Run IDs (UTC)",
            "",
            f"- Date folder: `audits/runs/{day}/`",
            f"- Example stem: `{run_ts}` → {run_id_line}",
            f"- Synthesizer outputs: {synth_names}",
            "",
        ]
    )

    step = 1
    config = load_project_config()

    if include_core and agents:
        lines.append("## Core agent checklist (run in order; JSON only per prompt)")
        lines.append("")
        resolved_agents = []
        for a in agents:
            prompt = AGENT_PROMPTS.get(a)
            if not prompt:
                print(f"  WARNING: Skipping agent '{a}' — no prompt file mapped in AGENT_PROMPTS")
                continue
            if not os.path.isfile(os.path.join(root, prompt)):
                print(f"  WARNING: Skipping agent '{a}' — prompt file not found: {prompt}")
                continue
            resolved_agents.append(a)
        agents = resolved_agents

        for a in agents:
            prompt = AGENT_PROMPTS[a]
            suite = a if a != "performance" else "perf"
            agent_paths = get_agent_paths(config, a)
            path_hint = ""
            if agent_paths:
                path_hint = "  Paths: " + ", ".join(f"`{p}`" for p in agent_paths[:6])
            lines.append(
                f"{step}. **{a}** — read `{prompt}`, write `{suite}-{run_ts}.json`{path_hint}"
            )
            step += 1

        ingest_cmd = (
            f"python3 audits/session.py ingest-synth audits/runs/{day}/synthesized-{run_ts}.json"
        )
        lines.extend(
            [
                "",
                f"{step}. **synthesizer (core)** — read `audits/prompts/synthesizer.md`, merge all "
                f"core agent JSON above, write `synthesized-{run_ts}.json`",
                "",
                f"{step + 1}. **canonical merge (core)** — run:",
                "",
                "```",
                ingest_cmd,
                "```",
                "",
                "_(strict by default: fails if carry-forward contract violated; regenerates all case files)_",
                "",
            ]
        )
        step += 2
    elif include_core and not agents:
        lines.append("## Core agent checklist")
        lines.append("")
        lines.append("_No core agents this run (empty verification queue or visual-only scope)._")
        lines.append("")

    resolved_visual = []
    for va in visual_agents:
        prompt = VISUAL_AGENT_PROMPTS.get(va)
        if not prompt:
            print(f"  WARNING: Skipping visual agent '{va}' — not in VISUAL_AGENT_PROMPTS")
            continue
        if not os.path.isfile(os.path.join(root, prompt)):
            print(f"  WARNING: Skipping visual agent '{va}' — prompt file not found: {prompt}")
            continue
        resolved_visual.append(va)
    visual_agents = resolved_visual

    if include_visual and visual_agents:
        lines.append("## Visual agent checklist (run in order; JSON only per prompt)")
        lines.append("")
        for va in visual_agents:
            prompt = VISUAL_AGENT_PROMPTS[va]
            slug = f"visual-{va}"
            vpaths = get_agent_paths(config, "visual")
            path_hint = ""
            if vpaths:
                path_hint = "  Paths: " + ", ".join(f"`{p}`" for p in vpaths[:6])
            lines.append(
                f"{step}. **visual:{va}** — read `{prompt}`, write `{slug}-{run_ts}.json`{path_hint}"
            )
            step += 1
        visual_ingest = (
            f"python3 audits/session.py ingest-synth "
            f"audits/runs/{day}/visual-synthesized-{run_ts}.json"
        )
        lines.extend(
            [
                "",
                f"{step}. **synthesizer (visual)** — read `{VISUAL_SYNTH_PROMPT}`, merge all visual "
                f"agent JSON above, write `visual-synthesized-{run_ts}.json`",
                "",
                f"{step + 1}. **canonical merge (visual)** — run:",
                "",
                "```",
                visual_ingest,
                "```",
                "",
                "_(same strict carry-forward rules as core ingest)_",
                "",
            ]
        )
        step += 2

    lines.extend(["## One-block prompt (paste into Cursor / ChatGPT)", ""])
    if full_scope and include_core:
        lines.append(
            "Full monorepo audit (`--full`): do not edit application source code. For each agent "
            "prompt below, read the prompt file and emit exactly one JSON object per LYRA output "
            "contract. Use preflight artifacts under `audits/artifacts/_run_/`, read "
            "`audits/open_findings.json`, and focus on the paths listed under Focus paths. Save "
            "agent and synthesizer JSON under `audits/runs/<YYYY-MM-DD>/` with the run_id format "
            "shown in each prompt. After each synthesizer JSON is saved, run the matching "
            "**ingest-synth** command so canonical audit files update."
        )
    elif include_core and not full_scope and plan.get("has_pending_verify"):
        lines.append(
            "Verification batch: do not edit application source code. Each core agent reads its "
            "prompt and emits one JSON (`kind: agent_output`) scoped to **Focus paths** and to "
            "proving or disproving fixes for **every** `finding_id` under **Findings to verify**. "
            "The core synthesizer must adjudicate each listed row, then merge with strict "
            "carry-forward. Visual agents use `suite: \"visual\"` in JSON; the visual synthesizer "
            "merges the same way. Run **ingest-synth** once per synthesizer file."
        )
    elif include_core and agents:
        lines.append(
            "Exploratory core batch (no `fixed_pending_verify` queue): do not edit application "
            "source code. Emit one JSON per core agent prompt, then the core synthesizer, then "
            "run **ingest-synth** on `synthesized-*.json`. If visual agents are listed, same rules "
            "with `suite: \"visual\"` and **ingest-synth** on `visual-synthesized-*.json`."
        )
    else:
        lines.append(
            "Visual lane: do not edit application source code. Emit one JSON per visual prompt "
            "(`suite: \"visual\"`, `kind: \"agent_output\"`) focused on **Visual focus paths**, then "
            "run the visual synthesizer and **ingest-synth** on `visual-synthesized-*.json`."
        )
    lines.append("")
    for a in agents:
        lines.append(f"- `{AGENT_PROMPTS[a]}`")
    if include_core and agents:
        lines.append("- `audits/prompts/synthesizer.md`")
    for va in visual_agents:
        lines.append(f"- `{VISUAL_AGENT_PROMPTS[va]}`")
    if include_visual and visual_agents:
        lines.append(f"- `{VISUAL_SYNTH_PROMPT}`")
    lines.append("")
    lines.append("---")
    lines.append("")
    body = "\n".join(lines)
    with open(path_out, "w", encoding="utf-8") as f:
        f.write(body)
    with open(latest, "w", encoding="utf-8") as f:
        f.write(body)

    print("Batched checklist written:")
    print(f"  {path_out}")
    print(f"  → {latest}  (symlink-style duplicate for easy open)")
    print()
    if agents:
        print("Core agents:", ", ".join(agents))
    if visual_agents:
        print("Visual agents:", ", ".join(visual_agents))
    if include_core:
        print("Core focus paths:", len(touched), "path(s)")
    if include_visual:
        print("Visual focus paths:", len(vf_paths), "path(s)")
    if pending_rows and not full_scope:
        print("Verification queue:", len(pending_rows), "finding(s) (fixed_pending_verify)")


# --- Commands ---

def cmd_status():
    findings, _ = load_findings()
    if not findings:
        print("No open findings. You're clear.")
        return

    by_status = defaultdict(int)
    by_severity = defaultdict(int)
    by_type = defaultdict(int)
    blockers = []
    questions = []
    wip = []

    for f in findings:
        by_status[f.get("status", "?")] += 1
        by_severity[f.get("severity", "?")] += 1
        by_type[f.get("type", "?")] += 1
        if is_blocker(f):
            blockers.append(f)
        if is_question(f) and actionable(f):
            questions.append(f)
        if in_progress(f):
            wip.append(f)

    print("LYRA Session Dashboard")
    print("=" * 50)
    print(f"Total findings: {len(findings)}")
    print()
    valid_statuses = ["open", "accepted", "in_progress", "fixed_pending_verify", "fixed_verified", "deferred", "wont_fix", "duplicate"]
    print("By status:")
    for s in valid_statuses:
        if by_status.get(s, 0) > 0:
            print(f"  {s}: {by_status[s]}")
    # Show any non-standard statuses (pre-cleanup drift)
    for s, count in sorted(by_status.items()):
        if s not in valid_statuses and count > 0:
            print(f"  {s}: {count}  (non-standard -- run cleanup_open_findings.py)")
    print()
    valid_severities = ["blocker", "major", "minor", "nit"]
    print("By severity:")
    for s in valid_severities:
        if by_severity.get(s, 0) > 0:
            print(f"  {s}: {by_severity[s]}")
    for s, count in sorted(by_severity.items()):
        if s not in valid_severities and count > 0:
            print(f"  {s}: {count}  (non-standard -- run cleanup_open_findings.py)")
    print()

    if blockers:
        print(f"!! {len(blockers)} OPEN BLOCKERS -- fix before shipping:")
        for b in blockers:
            print(f"   {b['finding_id']}: {b.get('title', '?')}")
        print()

    if questions:
        print(f"?? {len(questions)} QUESTIONS need your decision:")
        for q in questions:
            print(f"   {q['finding_id']}: {q.get('title', '?')}")
        print()

    if wip:
        print(f">> {len(wip)} findings in progress:")
        for w in wip:
            print(f"   {w['finding_id']}: {w.get('title', '?')}")
        print()


def cmd_triage():
    findings, _ = load_findings()
    todo = sorted([f for f in findings if actionable(f)], key=sort_key)

    if not todo:
        print("Nothing to triage. All findings are resolved, deferred, or in progress.")
        return

    # Split into tiers
    fix_now = [f for f in todo if f.get("priority") == "P0"]
    fix_soon = [f for f in todo if f.get("priority") == "P1" and not is_question(f)]
    questions = [f for f in todo if is_open_question(f)]
    the_rest = [f for f in todo if f.get("priority") in ("P2", "P3") and not is_question(f)]

    print("LYRA Triage Plan")
    print("=" * 50)
    print()

    if fix_now:
        print(f"FIX NOW ({len(fix_now)} items) -- do these before anything else:")
        print("-" * 50)
        for f in fix_now:
            _print_finding_line(f)
        print()

    if fix_soon:
        limit = min(5, len(fix_soon))
        print(f"FIX THIS SESSION (showing top {limit} of {len(fix_soon)}):")
        print("-" * 50)
        for f in fix_soon[:limit]:
            _print_finding_line(f)
        print()

    if questions:
        print(f"DECIDE ({len(questions)} questions blocking progress):")
        print("-" * 50)
        for f in questions:
            print(f"  {f['finding_id']}")
            print(f"    {f.get('title', '?')}")
            fix = f.get("suggested_fix", {})
            if isinstance(fix, dict):
                approach = fix.get("approach", "")
                if approach:
                    print(f"    Options: {approach[:120]}")
            print()

    if the_rest:
        print(f"LATER ({len(the_rest)} items -- do not touch these today)")
        print()

    total_now = len(fix_now) + min(5, len(fix_soon))
    print(f"Session target: fix {total_now} items, decide {len(questions)} questions, then re-audit and ship.")


def _print_finding_line(f):
    effort = effort_str(f)
    files = affected_files(f)
    file_str = files[0] if files else "?"
    if len(files) > 1:
        file_str += f" (+{len(files)-1})"
    print(f"  {f.get('priority','?')} {f.get('severity','?'):8s} [{effort:7s}] {f['finding_id']}")
    print(f"    {f.get('title', '?')}")
    print(f"    File: {file_str}")
    print()


def cmd_fix(finding_id):
    findings, data = load_findings()
    for f in findings:
        if f["finding_id"] == finding_id:
            if f.get("status") == "in_progress":
                print(f"Already in progress: {finding_id}")
                return
            f["status"] = "in_progress"
            add_history(f, "patch_proposed", "Marked in-progress via session runner.")
            save_findings(data, findings)
            print(f"Marked in_progress: {finding_id}")
            print()
            # Show what to do
            fix = f.get("suggested_fix", {})
            if isinstance(fix, dict):
                print(f"Approach: {fix.get('approach', '?')}")
                print(f"Files: {', '.join(fix.get('affected_files', ['?']))}")
                print(f"Effort: {fix.get('estimated_effort', '?')}")
                tests = fix.get("tests_needed", [])
                if tests:
                    print(f"Tests needed:")
                    for t in tests:
                        print(f"  - {t}")
            print()
            print(f"When done: python3 session.py done {finding_id} [commit_sha]")
            return
    print(f"Finding not found: {finding_id}")


def cmd_done(finding_id, commit=None):
    findings, data = load_findings()
    for f in findings:
        if f["finding_id"] == finding_id:
            f["status"] = "fixed_pending_verify"
            notes = "Fix applied via session runner."
            if commit:
                notes += f" Commit: {commit}"
            add_history(f, "patch_applied", notes, commit=commit)
            save_findings(data, findings)
            print(f"Marked fixed_pending_verify: {finding_id}")
            print()
            # Suggest re-audit
            agent = agent_for_finding(f)
            files = affected_files(f)
            print(f"Re-audit suggestion:")
            print(f"  Agent: {AGENT_PROMPTS.get(agent, agent)}")
            print(f"  Scope: {', '.join(files) if files else 'affected files'}")
            print()
            print("After re-audit: merge the synthesizer JSON into canonical state:")
            print("  python3 audits/session.py ingest-synth audits/runs/<YYYY-MM-DD>/synthesized-<id>.json")
            print("Or mark verified without a full merge:")
            print(f"  python3 audits/session.py verify {finding_id}")
            print()
            print("Push to Linear:  python3 audits/linear_sync.py push")
            return
    print(f"Finding not found: {finding_id}")


def cmd_skip(finding_id, reason=None):
    findings, data = load_findings()
    for f in findings:
        if f["finding_id"] == finding_id:
            f["status"] = "deferred"
            notes = reason or "Deferred via session runner. No reason given."
            add_history(f, "deferred", notes)
            save_findings(data, findings)
            print(f"Deferred: {finding_id}")
            if reason:
                print(f"Reason: {reason}")
            print("Push to Linear:  python3 audits/linear_sync.py push")
            return
    print(f"Finding not found: {finding_id}")


def cmd_decide(finding_id, decision):
    findings, data = load_findings()
    for f in findings:
        if f["finding_id"] == finding_id:
            if f.get("type") != "question":
                print(f"Warning: {finding_id} is type '{f.get('type')}', not 'question'. Proceeding anyway.")
            f["status"] = "accepted"
            add_history(f, "note_added", f"Decision: {decision}")
            save_findings(data, findings)
            print(f"Decision recorded for {finding_id}: {decision}")
            print(f"Status moved to 'accepted'. Convert to a concrete fix when ready.")
            return
    print(f"Finding not found: {finding_id}")


def cmd_reaudit():
    """Print verification-only plan: ``fixed_pending_verify`` findings, paths, agents."""
    plan = collect_reaudit_plan(full_scope=False)
    touched_files = plan["touched_files"]
    agents_needed = plan["agents_needed"]
    pending_rows = plan.get("pending_verify") or []

    if not pending_rows and not agents_needed:
        findings, _ = load_findings()
        in_prog = [f for f in findings if in_progress(f)]
        if in_prog:
            print("Verification re-audit: no fixed_pending_verify rows.")
            print(f"(You have {len(in_prog)} finding(s) in_progress — finish with `done`, then verify.)")
        else:
            print("No fixed_pending_verify findings. Nothing to verify.")
        print("Tip: full exploratory audit →  python3 audits/session.py audit-batch --full")
        return

    print("Verification re-audit plan (fixed_pending_verify only)")
    print("=" * 50)
    print()
    print("Findings pending verification:")
    for row in pending_rows:
        print(f"  {row['finding_id']}: {row.get('title', '')}")
    print()
    print("Paths from those findings' affected_files (+ agent trigger map):")
    for tf in touched_files:
        print(f"  {tf}")
    print()
    print("Agents to run (evidence each pending row pass/fail):")
    for agent in agents_needed:
        prompt = AGENT_PROMPTS.get(agent, "?")
        print(f"  {agent}: {prompt}")
    print()
    print("After all agents run, run the synthesizer:")
    print("  audits/prompts/synthesizer.md")
    print()
    print("Batched checklist (preflight + paste-ready prompts):")
    print("  python3 audits/session.py audit-batch")
    print()
    print("Scope: verify only the listed finding_ids; synthesizer must set each to")
    print("fixed_verified or back to open with proof_hooks (carry-forward all other ledger rows).")
    print()
    print("To clear one row without a full synthesizer merge:")
    print("  python3 audits/session.py verify <finding_id>")
    print("  (after you have confirmed the fix in code/tests — same bar as synthesizer would use.)")


def cmd_verify(finding_id):
    """Advance fixed_pending_verify -> fixed_verified after human/small re-audit confirms the fix.

    Full LYRA still expects the synthesizer to merge canonical state; this command
    unblocks session.py when you have verified manually but have not reapplied synth JSON.
    """
    findings, data = load_findings()
    for f in findings:
        if f["finding_id"] != finding_id:
            continue
        if f.get("status") != "fixed_pending_verify":
            print(
                f"Cannot verify {finding_id}: status is {f.get('status')!r}, "
                "expected 'fixed_pending_verify'."
            )
            print("Use 'done' after fixing, or 'fix' / 'skip' as appropriate.")
            return
        f["status"] = "fixed_verified"
        add_history(
            f,
            "verified",
            "Marked fixed_verified via session runner after re-audit confirmation.",
        )
        save_findings(data, findings)
        print(f"Verified: {finding_id} -> fixed_verified")
        print()
        print("Optional: push status to Linear (maps to Done):")
        print("  python3 audits/linear_sync.py push")
        return
    print(f"Finding not found: {finding_id}")


def cmd_canship(include_visual=False):
    all_findings, _ = load_findings()
    findings = (
        all_findings
        if include_visual
        else [f for f in all_findings if f.get("suite") != "visual"]
    )

    blockers = [f for f in findings if is_blocker(f)]
    open_questions = [f for f in findings if is_open_question(f)]
    in_prog = [f for f in findings if in_progress(f)]
    pending = [f for f in findings if f.get("status") == "fixed_pending_verify"]

    issues = []

    if blockers:
        issues.append(f"{len(blockers)} open blockers")
        for b in blockers:
            issues.append(f"  - {b['finding_id']}: {b.get('title', '?')}")

    if open_questions:
        issues.append(f"{len(open_questions)} undecided questions")
        for q in open_questions:
            issues.append(f"  - {q['finding_id']}: {q.get('title', '?')}")

    if in_prog:
        issues.append(f"{len(in_prog)} fixes still in progress (not yet verified)")

    if pending:
        issues.append(f"{len(pending)} fixes pending verification (run re-audit)")

    if issues:
        print("NOT READY TO SHIP")
        print("=" * 50)
        for i in issues:
            print(f"  {i}")
        print()
        if blockers:
            print("Action: fix blockers first.")
        elif pending:
            print("Action: run verification re-audit (`reaudit` / `audit-batch`), then ingest-synth.")
        elif open_questions:
            print("Action: decide or defer open questions.")
        elif in_prog:
            print("Action: finish in-progress fixes or defer them.")
    else:
        actionable_count = sum(1 for f in findings if actionable(f))
        total = len(findings)
        print("READY TO SHIP")
        print("=" * 50)
        print(f"  {total} total findings in system")
        print(f"  {actionable_count} still open (none are blockers)")
        print(f"  0 undecided questions")
        print()
        print("Remaining open items are P1+ non-blockers. Safe to deploy.")
    if not include_visual:
        vf = [f for f in all_findings if f.get("suite") == "visual"]
        vb = sum(1 for f in vf if is_blocker(f))
        vq = sum(1 for f in vf if is_open_question(f))
        if vb or vq:
            print()
            print(
                f"(Visual suite: {vb} blocker(s), {vq} open question(s) excluded from gate. "
                "Use: python3 audits/session.py canship --include-visual)"
            )


def cmd_cohesion():
    """Print latest visual cohesion score from audits/cohesion.json (if any)."""
    path = os.path.join(repo_root(), COHESION_JSON)
    if not os.path.isfile(path):
        print("No cohesion history yet. Ingest a visual synthesizer JSON with cohesion_scores first.")
        return
    with open(path, encoding="utf-8") as fp:
        data = json.load(fp)
    hist = data.get("history") or []
    if not hist:
        print("No entries in cohesion history.")
        return
    latest = hist[-1]
    prev = hist[-2] if len(hist) > 1 else None
    scores = latest.get("scores") or {}
    overall = scores.get("overall")
    print("LYRA visual cohesion")
    print("=" * 50)
    print(f"  Latest run: {latest.get('run_id', '?')} @ {latest.get('timestamp', '?')}")
    if overall is not None:
        print(f"  Overall: {overall}")
        if prev:
            pscores = prev.get("scores") or {}
            po = pscores.get("overall")
            if po is not None:
                delta = float(overall) - float(po)
                sign = "+" if delta >= 0 else ""
                print(f"  Delta vs prior: {sign}{delta:.1f} (prior overall: {po})")
    for dim in ("systematic", "hierarchical", "consistent", "communicative", "polished"):
        if dim in scores:
            print(f"  {dim}: {scores[dim]}")
    interp = scores.get("interpretation")
    if interp:
        print(f"  Interpretation: {interp}")


def cmd_prune_closed(dry_run: bool = False):
    """Remove terminal-status rows from open_findings.json; keep audits/findings/*.md as archive."""
    findings, data = load_findings()
    if not findings:
        print("No findings to prune.")
        return

    pruned = [f for f in findings if f.get("status") in PRUNE_CLOSED_STATUSES]
    kept = [f for f in findings if f.get("status") not in PRUNE_CLOSED_STATUSES]
    pruned_ids = {f["finding_id"] for f in pruned}
    kept_ids = {f["finding_id"] for f in kept}

    for f in kept:
        rel = f.get("related_ids")
        if not rel:
            continue
        new_rel = [r for r in rel if r in kept_ids]
        if new_rel != rel:
            f["related_ids"] = new_rel

    print(f"Prune-closed ({'DRY RUN' if dry_run else 'live'})")
    print(f"  Ledger rows: {len(findings)} -> {len(kept)} (removing {len(pruned)} terminal)")
    if pruned:
        for f in sorted(pruned, key=lambda x: x.get("finding_id", "")):
            print(f"    - {f.get('finding_id')}: {f.get('status')} — {f.get('title', '')[:70]}")
    print()

    if not pruned_ids:
        print("Nothing to prune — no fixed_verified / wont_fix / duplicate / converted_to_enhancement rows.")
        return

    if dry_run:
        print("Dry run complete. Run without --dry-run to write open_findings.json.")
        print("Afterward: python3 audits/linear_sync.py prune   # drop orphan Linear map entries")
        return

    backup = OPEN_FINDINGS + ".pre-prune.bak"
    shutil.copy2(OPEN_FINDINGS, backup)
    print(f"Backup: {backup}")

    data["prune_closed_applied"] = NOW
    save_findings(data, kept)
    print(f"Written: {OPEN_FINDINGS} ({len(kept)} rows)")
    print("Next: python3 audits/linear_sync.py prune   # if you use Linear sync")


def cmd_default():
    """The zero-thought entry point. Just tells you what to do next."""
    findings, _ = load_findings()

    if not findings:
        print("No findings yet. Run your first audit:")
        print("  1. bash audits/setup.sh")
        print("  2. Paste audits/prompts/agent-logic.md into your LLM tool")
        print("  3. Save output to audits/runs/$(date +%Y-%m-%d)/")
        print("  4. Run the synthesizer")
        return

    blockers = [f for f in findings if is_blocker(f)]
    open_questions = [f for f in findings if is_open_question(f)]
    in_prog = [f for f in findings if in_progress(f)]
    pending = [f for f in findings if f.get("status") == "fixed_pending_verify"]
    todo = sorted([f for f in findings if actionable(f) and not is_question(f)], key=sort_key)

    print("LYRA -- What To Do Next")
    print("=" * 50)
    print()

    # Step through the decision tree
    if in_prog:
        print(f"You have {len(in_prog)} fix(es) in progress:")
        for f in in_prog:
            print(f"  {f['finding_id']}: {f.get('title','?')}")
        print()
        print("Finish them or defer:")
        print(f"  python3 session.py done <finding_id> [commit]")
        print(f"  python3 session.py skip <finding_id> 'reason'")
        return

    if pending:
        print(f"You have {len(pending)} fix(es) pending verification.")
        print()
        for f in pending:
            print(f"  {f['finding_id']}: {f.get('title', '?')}")
        print()
        print("Verification re-audit + synthesizer, then apply canonical merge:")
        print("  python3 audits/session.py reaudit")
        print("  # agents → synthesizer JSON → ingest:")
        print("  python3 audits/session.py ingest-synth audits/runs/<YYYY-MM-DD>/synthesized-<id>.json")
        print()
        print("Or, if you already confirmed fixes (tests/code review), mark verified:")
        print("  python3 audits/session.py verify <finding_id>")
        return

    if blockers:
        print(f"!! {len(blockers)} BLOCKERS. Fix these first:")
        for b in sorted(blockers, key=sort_key):
            _print_finding_line(b)
        fid = blockers[0]["finding_id"]
        print(f"Start: python3 session.py fix {fid}")
        return

    if open_questions:
        print(f"?? {len(open_questions)} questions need your decision:")
        for q in open_questions:
            print(f"  {q['finding_id']}: {q.get('title', '?')}")
            fix = q.get("suggested_fix", {})
            if isinstance(fix, dict) and fix.get("approach"):
                print(f"    Options: {fix['approach'][:120]}")
        print()
        qid = open_questions[0]["finding_id"]
        print(f"Decide: python3 session.py decide {qid} 'your decision'")
        print(f"Or defer: python3 session.py skip {qid} 'reason'")
        return

    if todo:
        # Show top 3
        top = todo[:3]
        print(f"{len(todo)} findings to work on. Top 3:")
        print()
        for f in top:
            _print_finding_line(f)
        fid = top[0]["finding_id"]
        print(f"Start: python3 session.py fix {fid}")
        print(f"Or see full list: python3 session.py triage")
        return

    # Nothing actionable
    print("All findings are resolved, deferred, or in progress.")
    print()
    cmd_canship()


# --- Main ---

def cmd_init():
    """Generate audits/project.toml with auto-detected values for this repo."""
    root = repo_root()
    out = os.path.join(root, "audits", "project.toml")
    if os.path.isfile(out):
        print(f"Already exists: {out}")
        print("Delete it first if you want to regenerate.")
        return

    # Detect project name from directory
    name = os.path.basename(root).lower().replace(" ", "-")

    # Detect package manager
    if os.path.isfile(os.path.join(root, "pnpm-lock.yaml")):
        pkg = "pnpm"
    elif os.path.isfile(os.path.join(root, "yarn.lock")):
        pkg = "yarn"
    else:
        pkg = "npm"

    # Detect preflight cwd
    cwd = ""
    for candidate in ("apps/dashboard", "frontend"):
        d = os.path.join(root, candidate)
        if os.path.isdir(d) and os.path.isfile(os.path.join(d, "package.json")):
            cwd = candidate
            break

    # Detect source directories
    detected_dirs = []
    for d in ("backend", "frontend", "src", "lib", "app", "apps", "packages",
              "services", "server", "api", "supabase", "infra", ".github/workflows"):
        if os.path.isdir(os.path.join(root, d)):
            detected_dirs.append(d)

    # Detect stack from files present
    stack_hints = []
    for marker, hint in [
        ("next.config.js", "Next.js"), ("next.config.ts", "Next.js"), ("next.config.mjs", "Next.js"),
        ("vite.config.ts", "Vite"), ("vite.config.js", "Vite"),
        ("requirements.txt", "Python"), ("pyproject.toml", "Python"),
        ("supabase/config.toml", "Supabase"),
        ("turbo.json", "Turborepo"),
        ("netlify.toml", "Netlify"),
    ]:
        if os.path.isfile(os.path.join(root, marker)):
            stack_hints.append(hint)
    stack = " + ".join(dict.fromkeys(stack_hints))  # dedupe preserving order

    lines = [
        f'# audits/project.toml — LYRA project config for {name}',
        f'# Generated by: python3 audits/session.py init',
        f'# Detected directories: {", ".join(detected_dirs) or "none"}',
        '',
        '[project]',
        f'name = "{name}"',
        f'description = ""',
        f'stack = "{stack}"',
        '',
        '[preflight]',
        f'lint = "{pkg} run lint"',
        f'typecheck = "{pkg} run typecheck"',
        f'test = "{pkg} run test"',
        f'build = "{pkg} run build"',
        f'cwd = "{cwd}"',
        '# Visual-only audits do not require green preflight; use:',
        '#   python3 audits/session.py visual-batch --skip-preflight',
        '',
        '# --- Agent paths ---',
        '# Fill in the paths each agent should examine in YOUR repo.',
        '# Use globs. session.py verifies they exist before including them.',
        '# Leave arrays empty to let session.py auto-detect.',
        '',
        '[paths.logic]',
        f'source = {_toml_array([f"{d}/**" for d in detected_dirs if d in ("backend", "frontend", "src", "apps", "packages", "services", "lib", "app", "server", "api")])}',
        f'config = {_toml_array([f for f in ("package.json", "tsconfig.json") if os.path.isfile(os.path.join(root, f))])}',
        '',
        '[paths.data]',
        f'migrations = {_toml_array([f"{d}/migrations/**" for d in detected_dirs if d == "supabase"] or [])}',
        'types = []',
        'validation = []',
        'writers = []',
        '',
        '[paths.ux]',
        f'ui = {_toml_array([f"{d}/**" for d in detected_dirs if d in ("frontend", "src", "apps")])}',
        'styles = []',
        'i18n = []',
        '',
        '[paths.performance]',
        'queries = []',
        'fetching = []',
        f'build_config = {_toml_array([f for f in ("package.json", "vite.config.ts", "next.config.ts", "next.config.js") if os.path.isfile(os.path.join(root, f))])}',
        '',
        '[paths.security]',
        'auth = []',
        'endpoints = []',
        f'env = {_toml_array([".env.example"] if os.path.isfile(os.path.join(root, ".env.example")) else [])}',
        '',
        '[paths.deploy]',
        f'build = {_toml_array([f for f in ("vite.config.ts", "next.config.ts", "next.config.js") if os.path.isfile(os.path.join(root, f))])}',
        f'ci = {_toml_array([".github/workflows/**"] if os.path.isdir(os.path.join(root, ".github/workflows")) else [])}',
        f'infra = {_toml_array([f"{d}/**" for d in detected_dirs if d == "infra"])}',
        'logging = []',
        '',
        '[paths.visual]',
        f'ui = {_toml_array([f"{d}/**" for d in detected_dirs if d in ("frontend", "src", "apps")])}',
        'styles = []',
        'config = []',
        '',
        '[integrations.linear]',
        'api_key_env = "LINEAR_API_KEY"',
        'team_id_env = "LINEAR_TEAM_ID"',
        'project_id_env = "LINEAR_PROJECT_ID"',
        'label_ids_env = "LINEAR_LABEL_IDS"',
    ]
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Created: {out}")
    print(f"Edit the [paths.*] sections to match your repo layout.")
    print(f"Detected: {pkg} package manager, {len(detected_dirs)} source dir(s)")


def _toml_array(items):
    """Format a Python list as a TOML inline array."""
    if not items:
        return "[]"
    return "[" + ", ".join(f'"{i}"' for i in items) + "]"


def main():
    if len(sys.argv) < 2:
        cmd_default()
        return

    cmd = sys.argv[1].lower()

    if cmd == "status":
        cmd_status()
    elif cmd == "triage":
        cmd_triage()
    elif cmd == "fix":
        if len(sys.argv) < 3:
            print("Usage: python3 session.py fix <finding_id>")
            sys.exit(1)
        cmd_fix(sys.argv[2])
    elif cmd == "done":
        if len(sys.argv) < 3:
            print("Usage: python3 session.py done <finding_id> [commit_sha]")
            sys.exit(1)
        commit = sys.argv[3] if len(sys.argv) > 3 else None
        cmd_done(sys.argv[2], commit)
    elif cmd == "skip":
        if len(sys.argv) < 3:
            print("Usage: python3 session.py skip <finding_id> [reason]")
            sys.exit(1)
        reason = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else None
        cmd_skip(sys.argv[2], reason)
    elif cmd == "decide":
        if len(sys.argv) < 4:
            print("Usage: python3 session.py decide <finding_id> <decision>")
            sys.exit(1)
        decision = " ".join(sys.argv[3:])
        cmd_decide(sys.argv[2], decision)
    elif cmd == "reaudit":
        cmd_reaudit()
    elif cmd == "preflight":
        cmd_preflight()
    elif cmd == "audit-batch":
        raw = sys.argv[2:]
        rlow = [a.lower() for a in raw]
        skip = "--skip-preflight" in rlow or "--no-preflight" in rlow
        full = "--full" in rlow
        suite_filter = "core"
        if "--all" in rlow:
            suite_filter = "all"
        elif "--visual" in rlow:
            suite_filter = "visual"
        lane = "all"
        for i, a in enumerate(raw):
            if a.lower() == "--lane" and i + 1 < len(raw):
                lane = raw[i + 1].lower()
                break
        cmd_audit_batch(
            skip_preflight=skip,
            full_scope=full,
            suite_filter=suite_filter,
            lane=lane,
        )
    elif cmd == "visual-batch":
        raw = sys.argv[2:]
        rlow = [a.lower() for a in raw]
        skip = "--skip-preflight" in rlow or "--no-preflight" in rlow
        full = "--full" in rlow
        lane = "all"
        for i, a in enumerate(raw):
            if a.lower() == "--lane" and i + 1 < len(raw):
                lane = raw[i + 1].lower()
                break
        cmd_audit_batch(
            skip_preflight=skip,
            full_scope=full,
            suite_filter="visual",
            lane=lane,
        )
    elif cmd in ("ingest-synth", "ingest-synthesizer"):
        args = sys.argv[2:]
        if not args:
            print(
                "Usage: python3 audits/session.py ingest-synth "
                "<path/to/synthesized-*.json> [--allow-partial] [--no-auto-fill]"
            )
            sys.exit(1)
        # Default is strict. --allow-partial opts out.
        extra_flags = []
        filtered = []
        for a in args:
            if a == "--allow-partial":
                extra_flags.append("--allow-partial")
            elif a == "--no-auto-fill":
                extra_flags.append("--no-auto-fill")
            elif a == "--strict":
                pass  # legacy no-op, strict is now default
            else:
                filtered.append(a)
        if len(filtered) != 1:
            print(
                "Usage: python3 audits/session.py ingest-synth "
                "<path/to/synthesized-*.json> [--allow-partial] [--no-auto-fill]"
            )
            sys.exit(1)
        ingest_mod = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ingest_synthesizer.py")
        cmd_line = [sys.executable, ingest_mod, filtered[0]] + extra_flags
        r = subprocess.run(cmd_line, cwd=repo_root())
        sys.exit(r.returncode)
    elif cmd == "verify":
        if len(sys.argv) < 3:
            print("Usage: python3 session.py verify <finding_id>")
            sys.exit(1)
        cmd_verify(sys.argv[2])
    elif cmd in ("prune-closed", "prune_closed"):
        dry = "--dry-run" in sys.argv or "-n" in sys.argv
        cmd_prune_closed(dry_run=dry)
    elif cmd == "canship":
        include_vis = "--include-visual" in [a.lower() for a in sys.argv[2:]]
        cmd_canship(include_visual=include_vis)
    elif cmd == "cohesion":
        cmd_cohesion()
    elif cmd == "init":
        cmd_init()
    elif cmd == "help":
        print(__doc__)
    else:
        print(f"Unknown command: {cmd}")
        print("Run 'python3 session.py help' for usage.")
        sys.exit(1)


if __name__ == "__main__":
    main()
