/**
 * netlify/functions/match_jobs.ts
 *
 * On-demand Netlify function — returns a ranked list of open job listings
 * that best match a given user's stored preferences.
 *
 * Invocation: GET /.netlify/functions/match_jobs?userId=<uuid>
 *
 * Auth: expects the Supabase service-role key so it can read any user's
 * data without going through RLS; the caller must be an authenticated
 * internal service or admin workflow — not called directly from the browser.
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/supabase';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const DEFAULT_LIMIT = 20;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * A flattened view of all stored preferences relevant for job matching.
 *
 * Fields are sourced from three database tables:
 *   - job_preferences            (preferred_roles, preferred_locations, salary,
 *                                 remote_ok, full_time, part_time, contract)
 *   - user_professional_profiles (skills, experience_years, current_location,
 *                                 open_to_work)
 *   - persona_preferences        (persona_weights — zero or more entries)
 */
export interface UserMatchPreferences {
  userId: string;

  // From job_preferences
  preferred_roles: string[] | null;
  preferred_locations: string[] | null;
  min_salary: number | null;
  max_salary: number | null;
  remote_ok: boolean | null;
  full_time: boolean | null;
  part_time: boolean | null;
  contract: boolean | null;

  // From user_professional_profiles
  skills: string[] | null;
  experience_years: number | null;
  current_location: string | null;
  open_to_work: boolean | null;

  // From persona_preferences (may be empty)
  persona_weights: Array<{ persona_id: string; weight: number | null }>;
}

interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  skills_required: string[] | null;
  posted_at: string;
  status: string;
}

interface ScoredJob {
  job: JobListing;
  score: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Loads and merges a user's preferences from the three source tables into a
 * single UserMatchPreferences object.  Returns null if the user does not
 * exist in any of the preference tables.
 *
 * @param supabase  Authenticated Supabase client (typed with the Database schema).
 * @param userId    UUID of the user whose preferences to load.
 */
async function loadUserMatchPreferences(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserMatchPreferences | null> {
  const [
    { data: jobPrefs },
    { data: profile },
    { data: personaRows },
  ] = await Promise.all([
    supabase
      .from('job_preferences')
      .select(
        'preferred_roles, preferred_locations, min_salary, max_salary, remote_ok, full_time, part_time, contract',
      )
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('user_professional_profiles')
      .select('skills, experience_years, location, open_to_work')
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('persona_preferences')
      .select('persona_id, weight')
      .eq('user_id', userId),
  ]);

  // If the user has no data in any preference table there is nothing to match.
  if (!jobPrefs && !profile) {
    return null;
  }

  const prefs: UserMatchPreferences = {
    userId,

    // Job preferences — default to null when the row is missing.
    preferred_roles: jobPrefs?.preferred_roles ?? null,
    preferred_locations: jobPrefs?.preferred_locations ?? null,
    min_salary: jobPrefs?.min_salary ?? null,
    max_salary: jobPrefs?.max_salary ?? null,
    remote_ok: jobPrefs?.remote_ok ?? null,
    full_time: jobPrefs?.full_time ?? null,
    part_time: jobPrefs?.part_time ?? null,
    contract: jobPrefs?.contract ?? null,

    // Professional profile — default to null when the row is missing.
    skills: profile?.skills ?? null,
    experience_years: profile?.experience_years ?? null,
    current_location: profile?.location ?? null,
    open_to_work: profile?.open_to_work ?? null,

    // Persona preferences — empty array when no rows exist.
    persona_weights: (personaRows ?? []).map((row) => ({
      persona_id: row.persona_id,
      weight: row.weight,
    })),
  };

  return prefs;
}

/**
 * Scores a single job listing against a user's match preferences.
 * Returns a normalised score in [0, 1]; higher is a better match.
 */
function scoreJob(job: JobListing, prefs: UserMatchPreferences): number {
  let score = 0;
  let factors = 0;

  // Remote preference
  if (prefs.remote_ok != null) {
    factors++;
    if (job.remote === prefs.remote_ok) score++;
  }

  // Minimum salary expectation
  if (prefs.min_salary != null && job.salary_max != null) {
    factors++;
    if (job.salary_max >= prefs.min_salary) score++;
  }

  // Preferred role keywords
  if (prefs.preferred_roles != null && prefs.preferred_roles.length > 0) {
    const titleLower = job.title.toLowerCase();
    const matched = prefs.preferred_roles.filter((role) =>
      titleLower.includes(role.toLowerCase()),
    ).length;
    score += matched / prefs.preferred_roles.length;
    factors++;
  }

  // Skill overlap
  const userSkills = new Set(
    (prefs.skills ?? []).map((s) => s.toLowerCase()),
  );
  const jobSkills = job.skills_required ?? [];
  if (userSkills.size > 0 && jobSkills.length > 0) {
    const matched = jobSkills.filter((s) =>
      userSkills.has(s.toLowerCase()),
    ).length;
    score += matched / jobSkills.length;
    factors++;
  }

  return factors === 0 ? 0 : score / factors;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  const userId = event.queryStringParameters?.userId;
  if (!userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required query parameter: userId' }),
    };
  }

  const limitParam = event.queryStringParameters?.limit;
  const limit = limitParam ? Math.min(Number(limitParam), 100) : DEFAULT_LIMIT;
  if (Number.isNaN(limit) || limit <= 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid limit parameter' }),
    };
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const prefs = await loadUserMatchPreferences(supabase, userId);
  if (!prefs) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'No match preferences found for user', userId }),
    };
  }

  const { data: jobs, error: jobsError } = await supabase
    .from('job_listings')
    .select('*')
    .eq('status', 'open')
    .order('posted_at', { ascending: false })
    .limit(500);

  if (jobsError) {
    console.error('[match_jobs] Failed to fetch job listings', jobsError);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch job listings' }),
    };
  }

  const scored: ScoredJob[] = (jobs as JobListing[])
    .map((job) => ({ job, score: scoreJob(job, prefs) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  console.log(
    `[match_jobs] userId=${userId} candidates=${(jobs as JobListing[]).length} returned=${scored.length}`,
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      userId,
      count: scored.length,
      matches: scored.map(({ job, score }) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.remote,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        posted_at: job.posted_at,
        score: Math.round(score * 100),
      })),
    }),
  };
};
