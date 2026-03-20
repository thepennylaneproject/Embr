/**
 * netlify/functions/match_jobs.ts
 *
 * On-demand batch job-matching endpoint.
 *
 * POST body (JSON):
 *   { userIds: string[], scoreThreshold?: number }
 *
 * The function applies a hard wall-clock timeout (MATCH_JOBS_TIMEOUT_MS, default
 * 25 s).  When the deadline expires the AbortController fires, the MatchingService
 * loop exits cleanly at the next signal check, and partial results are returned
 * with HTTP 206 (Partial Content).
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * IMPORTANT — why AbortController instead of Promise.race:
 *
 *   The naive approach is:
 *
 *     const timeoutP = new Promise((_, reject) =>
 *       setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS),
 *     );
 *     const result = await Promise.race([matchingService.matchJobs(...), timeoutP]);
 *
 *   This is incorrect.  Promise.race only controls which branch *wins the
 *   await*; the losing branch keeps running as an orphaned microtask until the
 *   Netlify worker is recycled.  Under load this produces:
 *     • Duplicate CPU usage on overlapping requests.
 *     • Inaccurate partial-result counts (writes may still arrive after the
 *       function has already responded).
 *
 *   The fix used here instead:
 *     1. Create an AbortController before starting any work.
 *     2. Schedule controller.abort() after the timeout (no Promise involved).
 *     3. Pass controller.signal into matchJobs() — it is checked before every
 *        user iteration and before every per-job score step.
 *     4. In the finally block, clear the timeout so it does not fire after a
 *        successful fast completion.
 *
 *   This guarantees that no scorer work continues once the deadline fires.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { MatchingService, type JobListing } from '../../src/services/MatchingService';
import { validateMatchJobsRequest } from './utils/jobValidation';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** Wall-clock budget for the entire batch.  Override via env var. */
const BATCH_TIMEOUT_MS = Number(process.env.MATCH_JOBS_TIMEOUT_MS ?? '25000');

/** Maximum number of users accepted in a single request to prevent abuse. */
const MAX_USERS_PER_REQUEST = 500;

/** Maximum number of open jobs fetched for scoring. */
const MAX_JOBS_FETCHED = 500;

export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ── Parse and validate request body ────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(event.body ?? '{}');
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const bodyResult = validateMatchJobsRequest(rawBody);
  if (!bodyResult.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Invalid request body',
        details: bodyResult.errors,
      }),
    };
  }

  const userIds = bodyResult.data.userIds.slice(0, MAX_USERS_PER_REQUEST);
  const scoreThreshold = bodyResult.data.scoreThreshold;

  // ── Fetch job listings ──────────────────────────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: jobs, error: jobsError } = await supabase
    .from('job_listings')
    .select('*')
    .eq('status', 'open')
    .order('posted_at', { ascending: false })
    .limit(MAX_JOBS_FETCHED);

  if (jobsError) {
    console.error('[match_jobs] failed to fetch job listings', jobsError);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch job listings' }),
    };
  }

  const jobListings = (jobs as JobListing[]) ?? [];

  // ── Set up AbortController with a hard timeout ──────────────────────────────
  //
  // The AbortController is created here and its signal is passed directly into
  // matchJobs().  When the timeout fires, controller.abort() is called, which
  // sets signal.aborted = true.  The scorer loop checks this flag before each
  // user's work AND before each individual job scoring step, so the work stops
  // at the next check point — no orphaned scorer tasks.
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    console.warn(
      `[match_jobs] batch timeout after ${BATCH_TIMEOUT_MS}ms — aborting`,
    );
    controller.abort(new Error(`Batch timeout exceeded (${BATCH_TIMEOUT_MS}ms)`));
  }, BATCH_TIMEOUT_MS);

  const matchingService = new MatchingService(supabase);

  try {
    const result = await matchingService.matchJobs(
      userIds,
      jobListings,
      controller.signal, // ← signal is wired in; abort stops the scorer loop
      scoreThreshold,
    );

    const statusCode = result.cancelledByAbort ? 206 : 200;

    if (result.cancelledByAbort) {
      console.warn(
        `[match_jobs] partial result: processed=${result.processedUsers}/${userIds.length} ` +
          `matches=${result.results.length}`,
      );
    } else {
      console.log(
        `[match_jobs] complete: processed=${result.processedUsers} ` +
          `matches=${result.results.length}`,
      );
    }

    return {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        results: result.results,
        processedUsers: result.processedUsers,
        totalUsers: userIds.length,
        cancelledByAbort: result.cancelledByAbort,
      }),
    };
  } catch (err) {
    console.error('[match_jobs] unexpected error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  } finally {
    // Always clear the timeout.  If the batch finished before the deadline
    // this prevents a stale abort() call from firing later.
    clearTimeout(timeoutHandle);
  }
};
