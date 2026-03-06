# Audit Workflow Guardrails

This workflow prevents audit/release loops when only audit artifacts change.

## 1) Pre-audit gate (mandatory)

Before running agents, check whether qualifying source changes exist since the last audit.

Qualifying change paths (customize for your repo):

- `src/**`
- `lib/**`
- `app/**`
- `pages/**`
- `server/**`
- `api/**`
- `scripts/**`
- `.github/workflows/**`
- `public/**`
- Runtime/deploy config files (`package.json`, `package-lock.json`, `vite.config.*`, `next.config.*`, `tsconfig*.json`, `.env.example`)

If your repo has additional source directories (e.g., `netlify/`, `supabase/`, `docker/`), add them to this list.

Quick manual check:

```bash
# What changed since last audit run?
git diff --name-only $(git log -1 --format=%H -- audits/runs) HEAD
```

If the only changes are under `audits/`, skip the full audit and record an artifact-only note.

## 2) Preflight (mandatory, 1-2 minutes)

```bash
rm -rf audits/artifacts/_run_ && mkdir -p audits/artifacts/_run_

# Run whatever your project supports (ignore failures)
npm test -- --run > audits/artifacts/_run_/tests.txt 2>&1 || true
npm run lint > audits/artifacts/_run_/lint.txt 2>&1 || true
npm run build > audits/artifacts/_run_/build.txt 2>&1 || true
npx tsc --noEmit > audits/artifacts/_run_/typecheck.txt 2>&1 || true
```

Replace `npm` with `pnpm` or `yarn` as appropriate. If a command doesn't exist, the `|| true` skips it.

## 3) Agent execution

Run 1-6 agents depending on Fast Lane vs Deep Audit:

| Agent | Prompt | Run ID format |
|-------|--------|---------------|
| A: Logic | `audits/prompts/agent-logic.md` | `logic-<YYYYMMDD>-<HHmmss>` |
| B: Data | `audits/prompts/agent-data.md` | `data-<YYYYMMDD>-<HHmmss>` |
| C: UX | `audits/prompts/agent-ux.md` | `ux-<YYYYMMDD>-<HHmmss>` |
| D: Performance | `audits/prompts/agent-performance.md` | `perf-<YYYYMMDD>-<HHmmss>` |
| E: Security | `audits/prompts/agent-security.md` | `security-<YYYYMMDD>-<HHmmss>` |
| F: Deploy | `audits/prompts/agent-deploy.md` | `deploy-<YYYYMMDD>-<HHmmss>` |

Save each output to: `audits/runs/<YYYY-MM-DD>/<run_id>.json`

## 4) Synthesizer

Run `audits/prompts/synthesizer.md` last with all agent outputs.

Save to: `audits/runs/<YYYY-MM-DD>/synthesized-<YYYYMMDD>-<HHmmss>.json`

The synthesizer updates:
- `audits/open_findings.json` (canonical state)
- `audits/index.json` (run history)
- `audits/findings/<ID>.md` (case files)

## 5) Triage gate

Apply the rubric:

- P0 blockers: fix now.
- P0/P1 majors with small effort: fix this session.
- Questions: decide now or defer with explicit note.
- Everything else: note and move on.

Timebox each cycle (recommended: 60-90 minutes).

## 6) Re-audit scope rule

- Re-audit only files touched by fixes.
- Run full synthesizer once at cycle end.
- If no qualifying code/runtime changes occurred, record an artifact-only delta and close cycle.

## 7) Release gate

Before deploying, verify:

- Latest `open_findings.json` run_id matches latest `audits/index.json` entry.
- No blocker findings remain open from the current cycle.
- All `question` findings have a decision or explicit deferral.

## 8) Definition of done

- One synthesized run artifact for the cycle.
- One set of status/decision updates in `audits/open_findings.json`.
- No duplicate fresh-audit passes without qualifying code/runtime changes.

## 9) Enum cleanup

If agents have drifted on enum values, run:

```bash
python3 audits/cleanup_open_findings.py --dry-run   # preview
python3 audits/cleanup_open_findings.py              # apply
```
