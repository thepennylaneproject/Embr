/**
 * process-job.ts
 *
 * Background job processor for the Embr LYRA audit pipeline.
 * Loads cluster prompts, runs audit agents, and writes results to the runs directory.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Path Utilities ──────────────────────────────────────────────────────────

/**
 * Resolves the repository root by walking up from the worker's directory.
 *
 * The repo root is identified by the presence of:
 *   - `audits/prompts/` directory (LYRA audit system)
 *   - `apps/` directory (monorepo workspace)
 *   - `package.json` at the top level
 *
 * This multi-marker approach avoids false matches on the worker's own
 * local `audits/` subdirectory.
 *
 * The worker may be run from any working directory, so we use __dirname
 * (which is `apps/worker/src` under ts-node or `apps/worker/dist` when
 * compiled) and walk upward to find the repo root.
 */
export function repoRoot(): string {
  let candidate = __dirname;
  const maxDepth = 10;

  for (let i = 0; i < maxDepth; i++) {
    const hasAuditsPrompts = fs.existsSync(path.join(candidate, 'audits', 'prompts'));
    const hasAppsDir = fs.existsSync(path.join(candidate, 'apps'));
    const hasPackageJson = fs.existsSync(path.join(candidate, 'package.json'));

    if (hasAuditsPrompts && hasAppsDir && hasPackageJson) {
      return candidate;
    }

    const parent = path.dirname(candidate);
    if (parent === candidate) {
      break; // reached filesystem root
    }
    candidate = parent;
  }

  throw new Error(
    `[worker] Cannot locate repository root. ` +
    `Searched upward from "${__dirname}" up to ${maxDepth} levels. ` +
    `Expected a directory with "audits/prompts/", "apps/", and "package.json".`
  );
}

// ─── Prompt Types ────────────────────────────────────────────────────────────

export interface ClusterPrompts {
  /** The core system prompt injected before every agent prompt. */
  coreSystemPrompt: string;
  /** Map of agent name → agent-specific prompt content. */
  agentPrompts: Record<string, string>;
}

// ─── Prompt Loader ───────────────────────────────────────────────────────────

/**
 * Loads the LYRA cluster prompts from disk.
 *
 * Primary path (repo root):  `<repoRoot>/audits/prompts/core_system_prompt.md`
 * Legacy path (worker-local): `<workerRoot>/audits/prompts/core_system_prompt.md`
 *
 * The primary path is the canonical location checked first. The legacy path
 * is kept as a fallback for backwards compatibility when the worker has its
 * own copy of the prompts directory (e.g., in a standalone deployment).
 *
 * Throws a descriptive error if neither location contains the file so that
 * startup failures are immediately actionable.
 */
export function loadClusterPrompts(): ClusterPrompts {
  const root = repoRoot();

  // Primary location: repo-root audits/prompts/
  const primaryPath = path.join(root, 'audits', 'prompts', 'core_system_prompt.md');

  // Legacy/fallback location: worker-local audits/prompts/ (backwards compat)
  // __dirname is apps/worker/src (ts-node) or apps/worker/dist (compiled)
  // Going one level up from src or dist gives us the worker package root.
  const workerRoot = path.resolve(__dirname, '..');
  const legacyPath = path.join(workerRoot, 'audits', 'prompts', 'core_system_prompt.md');

  let coreResolved: string | null = null;

  if (fs.existsSync(primaryPath)) {
    coreResolved = primaryPath;
  } else if (fs.existsSync(legacyPath)) {
    console.warn(
      `[worker] core_system_prompt.md not found at primary path "${primaryPath}". ` +
      `Falling back to legacy worker-local path "${legacyPath}". ` +
      `Consider creating the file at the primary location.`
    );
    coreResolved = legacyPath;
  }

  if (!coreResolved) {
    throw new Error(
      `[worker] core_system_prompt.md not found.\n` +
      `  Primary path checked:  ${primaryPath}\n` +
      `  Legacy path checked:   ${legacyPath}\n` +
      `\n` +
      `To fix: create "audits/prompts/core_system_prompt.md" at the repository root.\n` +
      `See "audits/AGENT-PREAMBLE.md" for the canonical content.`
    );
  }

  const coreSystemPrompt = fs.readFileSync(coreResolved, 'utf-8');

  // Load per-agent prompts from the resolved prompts directory
  const promptsDir = path.dirname(coreResolved);
  const agentPrompts: Record<string, string> = {};

  const agentFiles = [
    'agent-logic.md',
    'agent-data.md',
    'agent-ux.md',
    'agent-performance.md',
    'agent-security.md',
    'agent-deploy.md',
    'synthesizer.md',
  ];

  for (const filename of agentFiles) {
    const agentPath = path.join(promptsDir, filename);
    if (fs.existsSync(agentPath)) {
      const agentName = filename.replace(/\.md$/, '');
      agentPrompts[agentName] = fs.readFileSync(agentPath, 'utf-8');
    }
  }

  return { coreSystemPrompt, agentPrompts };
}

// ─── Job Types ───────────────────────────────────────────────────────────────

export type AuditJobKind =
  | 'logic'
  | 'data'
  | 'ux'
  | 'performance'
  | 'security'
  | 'deploy'
  | 'synthesizer';

export interface AuditJob {
  id: string;
  kind: AuditJobKind;
  triggeredAt: string;
  /** Optional git branch to audit. Defaults to current branch. */
  branch?: string;
}

export interface JobResult {
  jobId: string;
  kind: AuditJobKind;
  status: 'success' | 'error';
  error?: string;
  promptUsed?: string;
  runId?: string;
}

// ─── Job Processor ───────────────────────────────────────────────────────────

/**
 * Processes a single audit job.
 *
 * Loads the cluster prompts, selects the prompt for the job's agent kind,
 * assembles the full prompt (core system + agent-specific), and returns
 * a JobResult with the assembled prompt for downstream LLM dispatch.
 *
 * This function is intentionally side-effect-free beyond file reads so that
 * it is easy to unit test. The caller is responsible for dispatching the
 * assembled prompt to an LLM and writing the result to `audits/runs/`.
 */
export function processJob(job: AuditJob): JobResult {
  let prompts: ClusterPrompts;

  try {
    prompts = loadClusterPrompts();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      jobId: job.id,
      kind: job.kind,
      status: 'error',
      error: `Failed to load cluster prompts: ${message}`,
    };
  }

  const agentPromptKey = job.kind === 'synthesizer' ? 'synthesizer' : `agent-${job.kind}`;
  const agentPrompt = prompts.agentPrompts[agentPromptKey];

  if (!agentPrompt) {
    return {
      jobId: job.id,
      kind: job.kind,
      status: 'error',
      error: `No prompt found for agent kind "${job.kind}" (looked up key: "${agentPromptKey}").`,
    };
  }

  // Assemble the full prompt: core system preamble + agent-specific instructions
  const fullPrompt = [
    prompts.coreSystemPrompt,
    '',
    '---',
    '',
    agentPrompt,
  ].join('\n');

  const now = new Date();
  const datePart = now.toISOString().replace(/[-:T]/g, '').slice(0, 15);
  const runId = `${job.kind}-${datePart}`;

  return {
    jobId: job.id,
    kind: job.kind,
    status: 'success',
    promptUsed: fullPrompt,
    runId,
  };
}
