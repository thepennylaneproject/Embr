/**
 * Entry point for the Embr audit worker.
 *
 * In production this would connect to a job queue (e.g. BullMQ / Redis).
 * For now it validates the prompt paths are accessible at startup.
 */

import { loadClusterPrompts } from './process-job';

async function main(): Promise<void> {
  console.log('[worker] Starting Embr audit worker...');

  try {
    const prompts = loadClusterPrompts();
    const agentCount = Object.keys(prompts.agentPrompts).length;
    console.log(`[worker] Loaded core system prompt (${prompts.coreSystemPrompt.length} chars)`);
    console.log(`[worker] Loaded ${agentCount} agent prompt(s): ${Object.keys(prompts.agentPrompts).join(', ')}`);
    console.log('[worker] Prompt validation passed. Worker is ready.');
  } catch (err) {
    console.error('[worker] Startup failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[worker] Unhandled error:', err);
  process.exit(1);
});
