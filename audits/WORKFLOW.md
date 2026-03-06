# Audit Workflow Guardrails

This workflow prevents audit/release loops when only audit artifacts change.

## 1) Pre-audit gate (mandatory)

Run:

```bash
npm run audit:precheck
```

Interpretation:

- exit `0`: qualifying runtime/deploy changes exist; full audit allowed.
- exit `2`: skip full audit (no qualifying changes or artifact-only delta).
- exit `1`: precheck failed; fix command/environment and retry.

Qualifying change paths:

- `apps/**`
- `docker/**`
- `.github/workflows/**`
- selected top-level runtime config files (`README.md`, `.env.example`, `apps/*/.env.example`, `package.json`)

## 2) Triage gate (LYRA Step 5)

Apply the rubric:

- P0 blockers: fix now.
- P0/P1 majors with small effort: fix this session.
- Questions: decide now or defer with explicit note.
- Everything else: note and move on.

Timebox each cycle (recommended: 60-90 minutes).

## 3) Re-audit scope rule

- Re-audit only files touched by fixes.
- Run full synthesizer once at cycle end.
- If no qualifying code/runtime changes occurred, record an artifact-only delta and close cycle.

## 4) Release gate

Run:

```bash
npm run audit:release-gate
```

This gate ensures:

- `audits/open_findings.json:last_run_id` matches latest `audits/index.json` run id.
- no newly created blocker findings remain open in the current cycle window.

## 5) Definition of done

- One synthesized run artifact for the cycle.
- One set of status/decision updates in `audits/open_findings.json`.
- One validation summary.
- No duplicate fresh-audit passes without qualifying code/runtime changes.
