# LYRA audit batch

- Generated: `20260427-223118Z` (UTC)
- Scope: **full monorepo**

## Preflight artifacts

Read these in agents that ask for them:

- `audits/artifacts/_run_/lint.txt`
- `audits/artifacts/_run_/typecheck.txt`
- `audits/artifacts/_run_/tests.txt`
- `audits/artifacts/_run_/build.txt`
- `audits/artifacts/_run_/bundle-stats.txt`

(If you used `--skip-preflight`, re-run `python3 audits/session.py preflight` first.)

## Focus paths

- `backend/**`
- `apps/**`
- `packages/**`
- `supabase/**`
- `package.json`
- `package-lock.json`
- `turbo.json`
- `.github/workflows/**`

## Run IDs (UTC)

- Date folder: `audits/runs/2026-04-27/`
- Example stem: `20260427-223118` → `logic-20260427-223118`, `data-20260427-223118`, …

## Agent checklist (run in order; JSON only per prompt)

1. **logic** — read `audits/prompts/agent-logic.md`, write `logic-20260427-223118.json`
2. **data** — read `audits/prompts/agent-data.md`, write `data-20260427-223118.json`
3. **ux** — read `audits/prompts/agent-ux.md`, write `ux-20260427-223118.json`
4. **performance** — read `audits/prompts/agent-performance.md`, write `perf-20260427-223118.json`
5. **security** — read `audits/prompts/agent-security.md`, write `security-20260427-223118.json`
6. **deploy** — read `audits/prompts/agent-deploy.md`, write `deploy-20260427-223118.json`

7. **synthesizer** — read `audits/prompts/synthesizer.md`, merge all agent JSON above, write `synthesized-20260427-223118.json`

8. **canonical merge** — run this exact command:

```
python3 audits/session.py ingest-synth audits/runs/2026-04-27/synthesized-20260427-223118.json
```

_(strict by default: fails if carry-forward contract violated; regenerates all case files)_

## One-block prompt (paste into Cursor / ChatGPT)

Audit pass: do not edit application source code. For each agent prompt below, read the prompt file and emit exactly one JSON object per LYRA output contract. Use preflight artifacts under `audits/artifacts/_run_/`, read `audits/open_findings.json`, and focus on the paths listed under Focus paths. Save agent and synthesizer JSON under `audits/runs/<YYYY-MM-DD>/` with the run_id format shown in each prompt. After the synthesizer JSON is saved, run the **ingest-synth** command from the checklist so canonical audit files update.

- `audits/prompts/agent-logic.md`
- `audits/prompts/agent-data.md`
- `audits/prompts/agent-ux.md`
- `audits/prompts/agent-performance.md`
- `audits/prompts/agent-security.md`
- `audits/prompts/agent-deploy.md`
- `audits/prompts/synthesizer.md`

---
