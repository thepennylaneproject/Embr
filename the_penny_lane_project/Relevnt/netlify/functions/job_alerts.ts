/**
 * netlify/functions/job_alerts.ts
 *
 * Scheduled Netlify function — delivers personalised job alert emails.
 * Trigger: cron schedule (configured in netlify.toml).
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import {
  batchAggregateUserProfiles,
  emptyAggregatedProfile,
  type AggregatedProfile,
} from '../../src/lib/scoring';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const MATCH_SCORE_THRESHOLD = Number(process.env.JOB_ALERT_SCORE_THRESHOLD ?? '0.6');

interface UserAlertRow {
  id: string;
  email: string;
  display_name: string | null;
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
}

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
  const userSkills = new Set([
    ...(prof?.skills ?? []),
    ...(profile.resume?.skills_extracted ?? []),
  ].map((s) => s.toLowerCase()));
  if (userSkills.size > 0 && (job.skills_required ?? []).length > 0) {
    const matched = job.skills_required!.filter((s) =>
      userSkills.has(s.toLowerCase()),
    ).length;
    score += matched / job.skills_required!.length;
    factors++;
  }
  return factors === 0 ? 0 : score / factors;
}

export const handler: Handler = async (
  _event: HandlerEvent,
  _context: HandlerContext,
) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch users with job alerts opted in.
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, display_name')
    .eq('job_alerts_enabled', true);

  if (usersError || !users?.length) {
    if (usersError) console.error('[job_alerts] fetch users failed', usersError);
    return { statusCode: usersError ? 500 : 200, body: JSON.stringify({ sent: 0 }) };
  }

  const userRows = users as UserAlertRow[];

  // Batch-aggregate all profiles — 3 DB queries regardless of user count.
  // Previously: aggregateUserProfile(supabase, user.id) inside the loop below
  // caused 4*N round-trips.  batchAggregateUserProfiles resolves all users at once.
  const profileMap = await batchAggregateUserProfiles(
    supabase,
    userRows.map((u) => u.id),
  );

  const { data: jobs } = await supabase
    .from('job_listings')
    .select('*')
    .eq('status', 'open')
    .order('posted_at', { ascending: false })
    .limit(200);

  const jobListings = (jobs as JobListing[]) ?? [];
  let totalAlertsSent = 0;

  for (const user of userRows) {
    const profile = profileMap.get(user.id) ?? emptyAggregatedProfile(user.id);

    const matchedJobs = jobListings
      .map((job) => ({ job, score: scoreJobForUser(job, profile) }))
      .filter(({ score }) => score >= MATCH_SCORE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (matchedJobs.length === 0) continue;

    supabase
      .from('email_queue')
      .insert({
        to_user_id: user.id,
        to_email: user.email,
        template: 'job_alerts',
        payload: {
          display_name: user.display_name ?? user.email,
          jobs: matchedJobs.map(({ job, score }) => ({
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            remote: job.remote,
            score: Math.round(score * 100),
          })),
        },
        created_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          console.error(`[job_alerts] enqueue failed for ${user.id}`, error);
        }
      });

    totalAlertsSent++;
  }

  console.log(
    `[job_alerts] processed=${userRows.length} sent=${totalAlertsSent}`,
  );
  return {
    statusCode: 200,
    body: JSON.stringify({ processed: userRows.length, sent: totalAlertsSent }),
  };
};
