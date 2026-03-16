/**
 * profileAggregator.test.ts
 *
 * Unit tests for batchAggregateUserProfiles.
 *
 * Test requirements (from PLP-15):
 *   1. batchAggregateUserProfiles for N users fires exactly 3 DB queries total.
 *   2. Users with no profile entries return an empty AggregatedProfile.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  batchAggregateUserProfiles,
  emptyAggregatedProfile,
  type ProfessionalProfile,
  type JobPreference,
  type Resume,
} from '../profileAggregator';

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

/**
 * Creates a minimal Supabase client mock that:
 *   - Records how many times `from()` is called (= number of DB queries).
 *   - Returns the provided fixture data for each table.
 */
function createMockSupabase(fixtures: {
  user_professional_profiles?: ProfessionalProfile[];
  job_preferences?: JobPreference[];
  resumes?: Resume[];
}) {
  const queriedTables: string[] = [];

  const buildChain = (table: string) => {
    const resolved = { data: fixtures[table as keyof typeof fixtures] ?? [], error: null };
    // Build a chainable query object that always resolves with the fixture data.
    // Every method returns `this` so arbitrary chains work; the object itself
    // is also a thenable so `await chain` resolves to `resolved`.
    const chain: Record<string, unknown> & PromiseLike<typeof resolved> = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(resolved),
      // Make the chain itself awaitable so `await supabase.from(...).select(...).in(...)` works.
      then: (
        onfulfilled: (value: typeof resolved) => unknown,
        onrejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(resolved).then(onfulfilled, onrejected),
    };
    return chain;
  };

  const supabase = {
    from: vi.fn((table: string) => {
      queriedTables.push(table);
      return buildChain(table);
    }),
  };

  return { supabase: supabase as unknown as SupabaseClient, queriedTables };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_A = 'user-a-uuid';
const USER_B = 'user-b-uuid';
const USER_C = 'user-c-uuid';

const profileA: ProfessionalProfile = {
  id: 'prof-a',
  user_id: USER_A,
  title: 'Software Engineer',
  bio: 'Builds things',
  skills: ['TypeScript', 'React'],
  experience_years: 3,
  location: 'Remote',
  open_to_work: true,
};

const prefB: JobPreference = {
  id: 'pref-b',
  user_id: USER_B,
  preferred_roles: ['Backend Engineer'],
  preferred_locations: ['New York'],
  min_salary: 80000,
  max_salary: 120000,
  remote_ok: true,
  full_time: true,
  part_time: false,
  contract: false,
};

const resumeC: Resume = {
  id: 'resume-c',
  user_id: USER_C,
  file_url: 'https://storage.example.com/resume-c.pdf',
  raw_text: 'Experienced backend developer with Go and Postgres',
  skills_extracted: ['Go', 'PostgreSQL', 'Docker'],
  created_at: '2024-01-15T12:00:00Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('batchAggregateUserProfiles', () => {
  describe('query count (PLP-15 N+1 regression)', () => {
    it('fires exactly 3 DB queries total for 3 users', async () => {
      const { supabase, queriedTables } = createMockSupabase({
        user_professional_profiles: [profileA],
        job_preferences: [prefB],
        resumes: [resumeC],
      });

      await batchAggregateUserProfiles(supabase, [USER_A, USER_B, USER_C]);

      expect(queriedTables).toHaveLength(3);
      expect(queriedTables).toContain('user_professional_profiles');
      expect(queriedTables).toContain('job_preferences');
      expect(queriedTables).toContain('resumes');
    });

    it('fires exactly 3 DB queries total for 1 user', async () => {
      const { supabase, queriedTables } = createMockSupabase({});
      await batchAggregateUserProfiles(supabase, [USER_A]);
      expect(queriedTables).toHaveLength(3);
    });

    it('fires exactly 3 DB queries total for 10 users', async () => {
      const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`);
      const { supabase, queriedTables } = createMockSupabase({});
      await batchAggregateUserProfiles(supabase, userIds);
      expect(queriedTables).toHaveLength(3);
    });

    it('fires 0 DB queries when the user list is empty', async () => {
      const { supabase, queriedTables } = createMockSupabase({});
      await batchAggregateUserProfiles(supabase, []);
      expect(queriedTables).toHaveLength(0);
    });
  });

  describe('result shape', () => {
    it('returns a Map with one entry per requested userId', async () => {
      const { supabase } = createMockSupabase({
        user_professional_profiles: [profileA],
        job_preferences: [],
        resumes: [],
      });

      const result = await batchAggregateUserProfiles(supabase, [USER_A, USER_B]);

      expect(result.size).toBe(2);
      expect(result.has(USER_A)).toBe(true);
      expect(result.has(USER_B)).toBe(true);
    });

    it('returns an empty Map when the input array is empty', async () => {
      const { supabase } = createMockSupabase({});
      const result = await batchAggregateUserProfiles(supabase, []);
      expect(result.size).toBe(0);
    });

    it('populates professionalProfile for a user that has one', async () => {
      const { supabase } = createMockSupabase({
        user_professional_profiles: [profileA],
        job_preferences: [],
        resumes: [],
      });

      const result = await batchAggregateUserProfiles(supabase, [USER_A]);
      const aggregated = result.get(USER_A)!;

      expect(aggregated.professionalProfile).toEqual(profileA);
      expect(aggregated.userId).toBe(USER_A);
    });

    it('populates jobPreferences for a user that has one', async () => {
      const { supabase } = createMockSupabase({
        user_professional_profiles: [],
        job_preferences: [prefB],
        resumes: [],
      });

      const result = await batchAggregateUserProfiles(supabase, [USER_B]);
      expect(result.get(USER_B)!.jobPreferences).toEqual(prefB);
    });

    it('populates resume for a user that has one', async () => {
      const { supabase } = createMockSupabase({
        user_professional_profiles: [],
        job_preferences: [],
        resumes: [resumeC],
      });

      const result = await batchAggregateUserProfiles(supabase, [USER_C]);
      expect(result.get(USER_C)!.resume).toEqual(resumeC);
    });

    it('does NOT populate personaPreferences (batch mode omits persona data)', async () => {
      const { supabase } = createMockSupabase({
        user_professional_profiles: [profileA],
        job_preferences: [],
        resumes: [],
      });

      const result = await batchAggregateUserProfiles(supabase, [USER_A]);
      expect(result.get(USER_A)!.personaPreferences).toEqual([]);
    });
  });

  describe('empty profile behaviour (PLP-15 requirement)', () => {
    it('returns null sub-documents for a user with no DB records', async () => {
      const { supabase } = createMockSupabase({
        user_professional_profiles: [],
        job_preferences: [],
        resumes: [],
      });

      const result = await batchAggregateUserProfiles(supabase, [USER_A]);
      const profile = result.get(USER_A)!;

      expect(profile.professionalProfile).toBeNull();
      expect(profile.jobPreferences).toBeNull();
      expect(profile.resume).toBeNull();
      expect(profile.personaPreferences).toEqual([]);
    });

    it('returns null sub-documents for all three users when the DB returns no rows', async () => {
      const { supabase } = createMockSupabase({
        user_professional_profiles: [],
        job_preferences: [],
        resumes: [],
      });

      const result = await batchAggregateUserProfiles(supabase, [
        USER_A,
        USER_B,
        USER_C,
      ]);

      for (const userId of [USER_A, USER_B, USER_C]) {
        const profile = result.get(userId)!;
        expect(profile.professionalProfile).toBeNull();
        expect(profile.jobPreferences).toBeNull();
        expect(profile.resume).toBeNull();
      }
    });

    it('correctly isolates data for mixed users — some with records, some without', async () => {
      const { supabase } = createMockSupabase({
        user_professional_profiles: [profileA],
        job_preferences: [prefB],
        resumes: [],
      });

      const result = await batchAggregateUserProfiles(supabase, [
        USER_A,
        USER_B,
        USER_C,
      ]);

      // User A has a professional profile only
      expect(result.get(USER_A)!.professionalProfile).toEqual(profileA);
      expect(result.get(USER_A)!.jobPreferences).toBeNull();

      // User B has job preferences only
      expect(result.get(USER_B)!.professionalProfile).toBeNull();
      expect(result.get(USER_B)!.jobPreferences).toEqual(prefB);

      // User C has nothing
      expect(result.get(USER_C)!.professionalProfile).toBeNull();
      expect(result.get(USER_C)!.jobPreferences).toBeNull();
      expect(result.get(USER_C)!.resume).toBeNull();
    });
  });

  describe('resume deduplication', () => {
    it('keeps only the first (newest) resume per user when multiple exist', async () => {
      const olderResume: Resume = {
        ...resumeC,
        id: 'resume-c-old',
        created_at: '2023-06-01T00:00:00Z',
      };

      const { supabase } = createMockSupabase({
        user_professional_profiles: [],
        job_preferences: [],
        // The mock returns newest first (as the real query would with ORDER BY created_at DESC)
        resumes: [resumeC, olderResume],
      });

      const result = await batchAggregateUserProfiles(supabase, [USER_C]);
      expect(result.get(USER_C)!.resume?.id).toBe('resume-c');
    });
  });
});

// ---------------------------------------------------------------------------
// emptyAggregatedProfile helper
// ---------------------------------------------------------------------------

describe('emptyAggregatedProfile', () => {
  it('returns a profile with all sub-documents null/empty', () => {
    const profile = emptyAggregatedProfile('test-user-id');
    expect(profile.userId).toBe('test-user-id');
    expect(profile.professionalProfile).toBeNull();
    expect(profile.jobPreferences).toBeNull();
    expect(profile.resume).toBeNull();
    expect(profile.personaPreferences).toEqual([]);
  });
});
