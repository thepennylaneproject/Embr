/**
 * profileAggregator.ts
 *
 * Utilities for aggregating user profile data from multiple Supabase tables
 * into a single AggregatedProfile object used by the scoring engine.
 *
 * Tables consumed:
 *   - user_professional_profiles  (1:1 per user)
 *   - job_preferences             (1:1 per user)
 *   - resumes                     (1:many; latest is used)
 *   - persona_preferences         (1:many; used only in single-user mode)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface ProfessionalProfile {
  id: string;
  user_id: string;
  title: string | null;
  bio: string | null;
  skills: string[] | null;
  experience_years: number | null;
  location: string | null;
  open_to_work: boolean | null;
}

export interface JobPreference {
  id: string;
  user_id: string;
  preferred_roles: string[] | null;
  preferred_locations: string[] | null;
  min_salary: number | null;
  max_salary: number | null;
  remote_ok: boolean | null;
  full_time: boolean | null;
  part_time: boolean | null;
  contract: boolean | null;
}

export interface Resume {
  id: string;
  user_id: string;
  file_url: string | null;
  raw_text: string | null;
  skills_extracted: string[] | null;
  created_at: string | null;
}

export interface PersonaPreference {
  id: string;
  user_id: string;
  persona_id: string;
  weight: number | null;
}

/**
 * A fully aggregated snapshot of a user's career profile data.
 *
 * In single-user mode (`aggregateUserProfile`) all four sub-documents are
 * populated.  In batch mode (`batchAggregateUserProfiles`) personaPreferences
 * is always an empty array — persona IDs differ per user and including them
 * would require N additional queries, defeating the purpose of batching.
 * job_alerts does not use persona scoring so this trade-off is acceptable.
 */
export interface AggregatedProfile {
  userId: string;
  professionalProfile: ProfessionalProfile | null;
  jobPreferences: JobPreference | null;
  resume: Resume | null;
  /** Always [] when returned from batchAggregateUserProfiles. */
  personaPreferences: PersonaPreference[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns an AggregatedProfile shell with all optional fields nulled/empty.
 * Used as a default for users who have no profile records yet.
 */
export function emptyAggregatedProfile(userId: string): AggregatedProfile {
  return {
    userId,
    professionalProfile: null,
    jobPreferences: null,
    resume: null,
    personaPreferences: [],
  };
}

// ---------------------------------------------------------------------------
// Single-user aggregation  (original implementation)
// ---------------------------------------------------------------------------

/**
 * Fetches all profile data for a single user.  Fires 4 parallel DB queries.
 *
 * ⚠️  Do NOT call this inside a loop over many users — use
 *     `batchAggregateUserProfiles` instead to avoid the N+1 problem.
 *
 * @param supabase  Authenticated Supabase client.
 * @param userId    UUID of the user to aggregate.
 */
export async function aggregateUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<AggregatedProfile> {
  const [
    { data: professionalProfile },
    { data: jobPreferences },
    { data: resume },
    { data: personaPreferences },
  ] = await Promise.all([
    supabase
      .from('user_professional_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('job_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('persona_preferences')
      .select('*')
      .eq('user_id', userId),
  ]);

  return {
    userId,
    professionalProfile: professionalProfile ?? null,
    jobPreferences: jobPreferences ?? null,
    resume: resume ?? null,
    personaPreferences: (personaPreferences as PersonaPreference[]) ?? [],
  };
}

// ---------------------------------------------------------------------------
// Batch aggregation  (N+1 fix)
// ---------------------------------------------------------------------------

/**
 * Fetches profile data for multiple users in exactly 3 DB round-trips,
 * regardless of how many users are in the list.
 *
 * Queries fired:
 *   1. user_professional_profiles  WHERE user_id IN (…)
 *   2. job_preferences             WHERE user_id IN (…)
 *   3. resumes                     WHERE user_id IN (…)
 *
 * persona_preferences is intentionally excluded.  Persona weights are
 * user-specific and would require one query per user to resolve correctly.
 * job_alerts scoring does not use persona weighting, so the omission has
 * no effect on alert quality.
 *
 * @param supabase  Authenticated Supabase client.
 * @param userIds   Array of user UUIDs to aggregate.
 * @returns         Map from userId → AggregatedProfile.  Every userId in the
 *                  input is guaranteed to have an entry in the output map;
 *                  users with no database records receive an empty profile.
 */
export async function batchAggregateUserProfiles(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, AggregatedProfile>> {
  if (userIds.length === 0) {
    return new Map();
  }

  // 3 parallel queries — one per table, batched across all users.
  const [
    { data: professionalProfiles },
    { data: jobPreferenceRows },
    { data: resumeRows },
  ] = await Promise.all([
    supabase
      .from('user_professional_profiles')
      .select('*')
      .in('user_id', userIds),

    supabase
      .from('job_preferences')
      .select('*')
      .in('user_id', userIds),

    supabase
      .from('resumes')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false }),
  ]);

  const safeProfiles = (professionalProfiles as ProfessionalProfile[]) ?? [];
  const safePreferences = (jobPreferenceRows as JobPreference[]) ?? [];
  const safeResumes = (resumeRows as Resume[]) ?? [];

  // Build lookup maps keyed by user_id for O(1) access during assembly.
  const profileByUser = new Map(safeProfiles.map((p) => [p.user_id, p]));
  const preferenceByUser = new Map(safePreferences.map((p) => [p.user_id, p]));
  // Resumes are ordered newest-first; keep only the first match per user.
  const resumeByUser = new Map<string, Resume>();
  for (const resume of safeResumes) {
    if (!resumeByUser.has(resume.user_id)) {
      resumeByUser.set(resume.user_id, resume);
    }
  }

  // Assemble one AggregatedProfile per requested userId.
  const result = new Map<string, AggregatedProfile>();
  for (const userId of userIds) {
    result.set(userId, {
      userId,
      professionalProfile: profileByUser.get(userId) ?? null,
      jobPreferences: preferenceByUser.get(userId) ?? null,
      resume: resumeByUser.get(userId) ?? null,
      personaPreferences: [],
    });
  }

  return result;
}
