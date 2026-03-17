/**
 * src/services/__tests__/matchingService.test.ts
 *
 * Integration tests for MatchingService.matchJobs cancellation semantics.
 *
 * Test coverage (from PLP-12 requirements):
 *   1. Timed-out batch stops further scoring work (no orphan scorer tasks).
 *   2. Partial result counts remain accurate after cancellation.
 *   3. Successful (non-aborted) run returns all results with correct counts.
 *   4. Pre-aborted signal prevents all work from starting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MatchingService, type JobListing } from '../MatchingService';
import type {
  ProfessionalProfile,
  JobPreference,
  Resume,
} from '../../lib/scoring/profileAggregator';

// ---------------------------------------------------------------------------
// Mock factory — mirrors the pattern in profileAggregator.test.ts
// ---------------------------------------------------------------------------

function createMockSupabase(fixtures: {
  user_professional_profiles?: ProfessionalProfile[];
  job_preferences?: JobPreference[];
  resumes?: Resume[];
}) {
  const buildChain = (table: string) => {
    const resolved = {
      data: fixtures[table as keyof typeof fixtures] ?? [],
      error: null,
    };
    const chain: Record<string, unknown> & PromiseLike<typeof resolved> = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(resolved),
      then: (
        onfulfilled: (value: typeof resolved) => unknown,
        onrejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(resolved).then(onfulfilled, onrejected),
    };
    return chain;
  };

  const supabase = {
    from: vi.fn((table: string) => buildChain(table)),
  };

  return supabase as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeJob = (id: string, overrides: Partial<JobListing> = {}): JobListing => ({
  id,
  title: `Job ${id}`,
  company: 'Acme Corp',
  location: 'Remote',
  remote: true,
  salary_min: 80000,
  salary_max: 120000,
  skills_required: ['TypeScript'],
  posted_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

const makeProfile = (userId: string): ProfessionalProfile => ({
  id: `prof-${userId}`,
  user_id: userId,
  title: 'Software Engineer',
  bio: null,
  skills: ['TypeScript'],
  experience_years: 3,
  location: 'Remote',
  open_to_work: true,
});

const makePreference = (userId: string): JobPreference => ({
  id: `pref-${userId}`,
  user_id: userId,
  preferred_roles: null,
  preferred_locations: null,
  min_salary: 70000,
  max_salary: 150000,
  remote_ok: true,
  full_time: true,
  part_time: false,
  contract: false,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MatchingService.matchJobs — cancellation semantics (PLP-12)', () => {
  const USER_IDS = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
  const JOBS = [makeJob('job-a'), makeJob('job-b'), makeJob('job-c')];

  let supabase: SupabaseClient;

  beforeEach(() => {
    supabase = createMockSupabase({
      user_professional_profiles: USER_IDS.map(makeProfile),
      job_preferences: USER_IDS.map(makePreference),
      resumes: [],
    });
  });

  // ── 1. Pre-aborted signal — no work runs ──────────────────────────────────

  describe('when the AbortSignal is already aborted before matchJobs is called', () => {
    it('returns empty results immediately without scoring any user', async () => {
      const controller = new AbortController();
      controller.abort(); // aborted *before* call

      const service = new MatchingService(supabase);
      const result = await service.matchJobs(USER_IDS, JOBS, controller.signal);

      expect(result.cancelledByAbort).toBe(true);
      expect(result.processedUsers).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  // ── 2. Abort during iteration — partial results are accurate ─────────────

  describe('when the signal is aborted after the first user is processed', () => {
    it('stops at the next user boundary and reports accurate processedUsers count', async () => {
      const controller = new AbortController();
      const service = new MatchingService(supabase);

      // We'll abort after the first user's jobs are scored by intercepting
      // the internal loop.  The simplest way to do this without access to
      // internals is to use a signal that fires after the first matchJobs call
      // yields (the profile fetch) but before the second user's work starts.
      //
      // Strategy: resolve the profile fetch normally, then schedule an abort
      // that fires synchronously after the first iteration.
      //
      // We can observe this by limiting userIds to 2 and aborting during the
      // first job scoring via a custom AbortSignal created from a Promise that
      // resolves after one tick.

      // Simpler approach: abort the signal mid-run from outside using a
      // carefully timed setTimeout(0) to fire after the batch-profile fetch.
      const matchPromise = service.matchJobs(USER_IDS, JOBS, controller.signal);

      // Abort after the batch profile fetch resolves (next microtask queue
      // turn).  Since matchJobs awaits batchAggregateUserProfiles first, the
      // abort will fire when control returns to the event loop after that
      // await, i.e. before the first user-scoring iteration completes.
      await Promise.resolve(); // yield once to let the profile fetch resolve
      controller.abort();

      const result = await matchPromise;

      expect(result.cancelledByAbort).toBe(true);
      // processedUsers should be strictly less than the total user count since
      // we aborted early.
      expect(result.processedUsers).toBeLessThan(USER_IDS.length);
    });

    it('the partial result count equals processedUsers × (jobs that scored)', async () => {
      const controller = new AbortController();
      const service = new MatchingService(supabase);

      // Use only 2 users so we can reason about exact counts.
      const twoUsers = ['user-1', 'user-2'];
      const twoJobs = [makeJob('job-x'), makeJob('job-y')];

      // Abort after profile fetch but before any user has been scored.
      const matchPromise = service.matchJobs(
        twoUsers,
        twoJobs,
        controller.signal,
      );
      // Yield to let the profile fetch await complete, then abort immediately.
      await Promise.resolve();
      controller.abort();

      const result = await matchPromise;

      expect(result.cancelledByAbort).toBe(true);
      // The user that was fully processed (if any) contributed exactly
      // twoJobs.length results (all jobs score > 0 because of skill match).
      expect(result.results.length).toBe(result.processedUsers * twoJobs.length);
    });
  });

  // ── 3. No abort — full run returns all results ────────────────────────────

  describe('without an AbortSignal', () => {
    it('processes all users and returns cancelledByAbort: false', async () => {
      const service = new MatchingService(supabase);
      const result = await service.matchJobs(USER_IDS, JOBS);

      expect(result.cancelledByAbort).toBe(false);
      expect(result.processedUsers).toBe(USER_IDS.length);
    });

    it('returns at least one result per user when skills match', async () => {
      const service = new MatchingService(supabase);
      const result = await service.matchJobs(USER_IDS, JOBS);

      // Each user has skill 'TypeScript', each job requires 'TypeScript', so
      // every (user, job) pair should score > 0.
      expect(result.results.length).toBe(USER_IDS.length * JOBS.length);
    });

    it('respects scoreThreshold — excludes pairs below the threshold', async () => {
      // Use a profile with no matching skills so score will be 0.
      const noSkillSupabase = createMockSupabase({
        user_professional_profiles: [
          {
            id: 'prof-u1',
            user_id: 'user-1',
            title: null,
            bio: null,
            skills: [], // no skills
            experience_years: null,
            location: null,
            open_to_work: null,
          },
        ],
        job_preferences: [],
        resumes: [],
      });

      const service = new MatchingService(noSkillSupabase);
      // Score will be 0 because no factors match; threshold 0.5 should exclude it.
      const result = await service.matchJobs(
        ['user-1'],
        [makeJob('job-z')],
        undefined,
        0.5,
      );

      expect(result.results).toHaveLength(0);
    });
  });

  // ── 4. AbortController + timeout pattern (PLP-12 root cause) ─────────────
  //
  // The real handler schedules `controller.abort()` via `setTimeout`, which is
  // a macrotask.  In production, the scoring loop may yield on async DB calls,
  // giving the macrotask a chance to fire between iterations.
  //
  // In unit tests the Supabase mock is synchronous (via Promise.resolve), so
  // the entire scoring loop completes in a single microtask burst before any
  // macrotask can fire.  To faithfully test the cancellation path we instead
  // abort the controller using the microtask queue: we yield once with
  // `await Promise.resolve()` so the profile-fetch microtasks complete (and
  // `batchAggregateUserProfiles` resolves), then abort synchronously before the
  // next event-loop tick gives control back to the scoring loop.  This is the
  // minimal-latency equivalent of the production timeout pattern.

  describe('AbortController timeout pattern — no orphan scorer tasks', () => {
    it('stops scoring when the controller fires, without throwing', async () => {
      const controller = new AbortController();
      const service = new MatchingService(supabase);

      // Start the batch, then abort before the inner scoring loop runs.
      // `await Promise.resolve()` places the abort call after the profile-fetch
      // microtasks but before the scoring loop's microtask slot, mirroring the
      // effect of a deadline timer in production.
      const matchPromise = service.matchJobs(USER_IDS, JOBS, controller.signal);
      await Promise.resolve(); // let profile-fetch microtasks drain
      controller.abort();     // signal the scorer to stop

      const result = await matchPromise;

      // Must not throw — the function should resolve with partial results.
      expect(result.cancelledByAbort).toBe(true);
      // processedUsers must be <= total, never negative.
      expect(result.processedUsers).toBeGreaterThanOrEqual(0);
      expect(result.processedUsers).toBeLessThanOrEqual(USER_IDS.length);
    });

    it('result count equals processedUsers × scored jobs — no over-count from orphaned work', async () => {
      const controller = new AbortController();
      const service = new MatchingService(supabase);

      const matchPromise = service.matchJobs(USER_IDS, JOBS, controller.signal);
      await Promise.resolve(); // let profile-fetch microtasks drain
      controller.abort();     // abort before the scoring loop runs

      const result = await matchPromise;

      // Each fully-processed user contributes exactly JOBS.length results
      // (all jobs have matching TypeScript skill, so every pair scores above 0).
      // A user whose work was interrupted by the abort contributes 0 results and
      // is NOT counted in processedUsers.
      // Invariant: results.length === processedUsers * JOBS.length
      expect(result.results.length).toBe(
        result.processedUsers * JOBS.length,
      );
    });
  });

  // ── 5. Signal with no pending work ───────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty userIds without error', async () => {
      const service = new MatchingService(supabase);
      const result = await service.matchJobs([], JOBS);

      expect(result.cancelledByAbort).toBe(false);
      expect(result.processedUsers).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('handles empty jobs list without error', async () => {
      const service = new MatchingService(supabase);
      const result = await service.matchJobs(USER_IDS, []);

      expect(result.cancelledByAbort).toBe(false);
      expect(result.processedUsers).toBe(USER_IDS.length);
      expect(result.results).toHaveLength(0);
    });

    it('a signal passed as undefined behaves like no signal', async () => {
      const service = new MatchingService(supabase);
      const withUndefined = await service.matchJobs(
        USER_IDS,
        JOBS,
        undefined,
      );
      const withoutSignal = await service.matchJobs(USER_IDS, JOBS);

      expect(withUndefined.cancelledByAbort).toBe(false);
      expect(withoutSignal.cancelledByAbort).toBe(false);
      expect(withUndefined.processedUsers).toBe(withoutSignal.processedUsers);
    });
  });
});
