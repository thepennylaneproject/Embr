# GitHub Copilot Instructions — The Pennylane Project

## Project Context

This is **The Pennylane Project** — a portfolio of 11 applications built by Sarah Sahl. The applications are:

1. **Advocera** — Python/SQLite legal-tech prototype
2. **Codra** — TypeScript/React/Netlify Functions AI-powered platform
3. **FounderOS** — Next.js 14 App Router founder productivity suite
4. **Mythos** — TypeScript monorepo AI marketing operations platform
5. **Passagr** — TypeScript/React travel visa research app
6. **Relevnt** — TypeScript/React job market intelligence platform
7. **embr** — NestJS/Next.js/React Native Turborepo creator monetization platform
8. **ready** — TypeScript/React/Vite career readiness app
9. **Dashboard** — Python/Streamlit personal medical data dashboard
10. **Restoration Project** — Next.js blog/briefing site
11. **sarahsahl.pro** — Static HTML/CSS/JS portfolio site

---

## Audit Behavior

### Expectations Documents

All audits **must** reference the expectations documents in `/expectations/`. There is one document per app:

- `expectations/advocera-expectations.md`
- `expectations/codra-expectations.md`
- `expectations/founderos-expectations.md`
- `expectations/mythos-expectations.md`
- `expectations/passagr-expectations.md`
- `expectations/relevnt-expectations.md`
- `expectations/embr-expectations.md`
- `expectations/ready-expectations.md`
- `expectations/dashboard-expectations.md`
- `expectations/restoration-project-expectations.md`
- `expectations/sarahsahl-pro-expectations.md`

The audit agent profile is at `.github/agents/audit-agent.md`.

### Issue Filing

Copilot **must** file a GitHub Issue for **every violation** found during an audit. Each issue must:

- Have title format: `[AUDIT] <short description>`
- Be labeled `audit` plus one severity label: `critical`, `warning`, or `suggestion`
- Include the file path and line number where applicable
- Quote the specific expectation being violated
- Include a recommended fix

### Citation Requirement

Copilot **must always** cite the specific section and rule number from the expectations document it is auditing against when filing an issue or making a comment. Example: `expectations/advocera-expectations.md § 3.1 — All endpoints must return 422 on validation failure`.

### Severity Definitions

| Label | When to Use |
|---|---|
| `critical` | Security vulnerability, data loss risk, broken production functionality, or direct violation of a hard constraint |
| `warning` | Architectural drift, missing required behavior, or a gap that will cause problems at scale |
| `suggestion` | Style inconsistency, missing documentation, or a best-practice that should be followed |

---

## Hard Rules (Non-Negotiable)

1. **Never auto-merge or auto-commit code changes.** All code changes require explicit human approval.
2. **Never modify expectations documents** (`/expectations/`) without explicit approval from Sarah Sahl.
3. **Never commit secrets, API keys, tokens, or credentials** to any file.
4. **Never deploy or trigger deployments** as part of an audit run.
5. **Always read the full expectations document** for the target app before beginning an audit.
6. **If an expectations document is missing** for a discovered app, file `[AUDIT] Missing expectations document for <app-name>` labeled `warning`.

---

## Code Generation Guidelines

When generating or suggesting code for any app in this portfolio:

- Match the language, framework, and dependency constraints documented in the app's expectations file
- Preserve existing authentication and authorization patterns
- Do not introduce new external dependencies without flagging them for review
- Parameterize all database queries — never construct raw SQL from user input
- Follow the existing error response format for each app's API layer
- Do not remove or weaken security headers or middleware

---

## Summary Reports

After completing an audit, Copilot must post a final summary comment on the triggering issue that includes:

- Total violations found, broken down by severity
- List of issues filed (with links)
- Any apps that were skipped or had missing expectations documents
- Overall compliance assessment per app
