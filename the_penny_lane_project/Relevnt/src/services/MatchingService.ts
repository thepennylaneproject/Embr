/**
 * src/services/MatchingService.ts
 *
 * Core service for batch job-to-user matching.
 *
 * Each call to `matchJobs` accepts an optional `AbortSignal`.  The signal is
 * checked before every user iteration *and* before every per-job scoring step,
 * so that when a timeout fires (or any other abort source triggers) the work
 * stops promptly and partial results are returned with accurate accounting.
 *
 * Design rationale — why AbortSignal instead of Promise.race:
 *   Promise.race with a rejection timeout only races the *awaited* promise; the
 *   underlying computation keeps running as an orphaned microtask.  An
 *   AbortSignal threads cancellation directly into the hot loop so no scorer
 *   work continues after the deadline.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  batchAggregateUserProfiles,
  emptyAggregatedProfile,
  type AggregatedProfile,
} from '../lib/scoring';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  skills_required: string[] | null;
  posted_at: string;
}

export interface MatchResult {
  userId: string;
  jobId: string;
  score: number;
}

export interface BatchMatchResult {
  /** All job–user pairs that exceeded scoreThreshold before any abort. */
  results: MatchResult[];
  /** Number of users fully processed (all their jobs scored) before abort. */
  processedUsers: number;
  /**
   * True when the run was cut short by an aborted signal.
   * False means all requested users were fully scored.
   */
  cancelledByAbort: boolean;
}

// ---------------------------------------------------------------------------
// Scoring helper (mirrors job_alerts.ts logic; kept local to avoid coupling)
// ---------------------------------------------------------------------------

function scoreJobForUser(job: JobListing, profile: AggregatedProfile): number {
  let score = 0;
  let factors = 0;

  const prefs = profile.jobPreferences;
  const prof = profile.professionalProfile;

  if (prefs?.remote_ok != null) {
    factors++;
    if (job.remote === prefs.remote_ok) score++;
  }

  if (prefs?.min_salary != null && job.salary_max != null) {
    factors++;
    if (job.salary_max >= prefs.min_salary) score++;
  }

  const userSkills = new Set(
    [
      ...(prof?.skills ?? []),
      ...(profile.resume?.skills_extracted ?? []),
    ].map((s) => s.toLowerCase()),
  );

  if (userSkills.size > 0 && (job.skills_required ?? []).length > 0) {
    const matched = job.skills_required!.filter((s) =>
      userSkills.has(s.toLowerCase()),
    ).length;
    score += matched / job.skills_required!.length;
    factors++;
  }

  return factors === 0 ? 0 : score / factors;
}

// ---------------------------------------------------------------------------
// MatchingService
// ---------------------------------------------------------------------------

export class MatchingService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Score every (user, job) pair in the batch.
   *
   * @param userIds        Users to score.
   * @param jobs           Job listings to score against.
   * @param signal         Optional AbortSignal.  When aborted the loop exits
   *                       immediately; partial results accumulated so far are
   *                       returned with `cancelledByAbort: true`.
   * @param scoreThreshold Minimum score (0–1) for a result to be included.
   *                       Defaults to 0 (include everything).
   */
  async matchJobs(
    userIds: string[],
    jobs: JobListing[],
    signal?: AbortSignal,
    scoreThreshold = 0,
  ): Promise<BatchMatchResult> {
    const results: MatchResult[] = [];
    let processedUsers = 0;
    let cancelledByAbort = false;

    // Fetch all user profiles in a single batch round-trip before the loop.
    // If already aborted before we start, bail out immediately.
    if (signal?.aborted) {
      return { results, processedUsers, cancelledByAbort: true };
    }

    const profileMap = await batchAggregateUserProfiles(
      this.supabase,
      userIds,
    );

    for (const userId of userIds) {
      // Check abort before starting work for each user.
      if (signal?.aborted) {
        cancelledByAbort = true;
        break;
      }

      const profile =
        profileMap.get(userId) ?? emptyAggregatedProfile(userId);

      for (const job of jobs) {
        // Check abort before each individual scoring step so that very large
        // job lists don't delay cancellation.
        if (signal?.aborted) {
          cancelledByAbort = true;
          break;
        }

        const score = scoreJobForUser(job, profile);
        if (score >= scoreThreshold) {
          results.push({ userId, jobId: job.id, score });
        }
      }

      if (cancelledByAbort) break;

      // Only increment after the inner loop completes without interruption.
      processedUsers++;
    }

    return { results, processedUsers, cancelledByAbort };
  }
}
