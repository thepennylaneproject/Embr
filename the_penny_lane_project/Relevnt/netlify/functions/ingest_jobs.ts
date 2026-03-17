/**
 * netlify/functions/ingest_jobs.ts
 *
 * Scheduled Netlify function — fetches job listings from external sources
 * (Greenhouse, Lever, Workday, Indeed) and upserts them into Supabase.
 *
 * Trigger: cron schedule (configured in netlify.toml).
 *
 * Performance note — company ID resolution
 * -----------------------------------------
 * Each job listing carries a company name string. We must resolve that to a
 * company UUID before inserting the job row. Naïvely calling resolveCompanyId()
 * inside the per-job loop fires one RPC round-trip per distinct company name.
 *
 * The fix: call bulkResolveCompanyIds() once before each provider's batch loop
 * to warm the module-level cache. Subsequent resolveCompanyId() calls inside
 * the loop return cached values and fire zero additional DB round-trips.
 *
 * Companies not matched by the bulk equality query (e.g. names that differ
 * slightly from the canonical form in the DB) are cached as null and then
 * resolved individually via the fuzzy-match RPC inside resolveCompanyId().
 * This preserves the existing fuzzy-match fallback for edge cases.
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import {
  resolveCompanyId,
  bulkResolveCompanyIds,
} from './utils/companyResolver';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const GREENHOUSE_API_KEY = process.env.GREENHOUSE_API_KEY ?? '';
const LEVER_API_KEY = process.env.LEVER_API_KEY ?? '';
const WORKDAY_TENANT = process.env.WORKDAY_TENANT ?? '';
const INDEED_PUBLISHER_ID = process.env.INDEED_PUBLISHER_ID ?? '';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

interface RawGreenhouseJob {
  id: number;
  title: string;
  location: { name: string } | null;
  company_name: string;
  absolute_url: string;
  updated_at: string;
  metadata: Array<{ name: string; value: string | null }> | null;
}

interface RawLeverJob {
  id: string;
  text: string;
  categories: {
    location: string | null;
    team: string | null;
    commitment: string | null;
  };
  hostedUrl: string;
  company: string;
  createdAt: number;
  workplaceType: 'remote' | 'onsite' | 'hybrid' | null;
}

interface RawWorkdayJob {
  id: string;
  title: string;
  company: string;
  primaryLocation: { descriptor: string } | null;
  remoteEligible: boolean | null;
  postedOn: string;
  jobReqId: string;
  externalUrl: string;
}

interface RawIndeedJob {
  jobkey: string;
  jobtitle: string;
  company: string;
  city: string | null;
  country: string | null;
  formattedRelativeTime: string;
  url: string;
  industryCodes: string[] | null;
  salary: string | null;
}

interface NormalisedJob {
  external_id: string;
  source: string;
  title: string;
  company: string;
  company_id: string | null;
  location: string | null;
  remote: boolean;
  apply_url: string;
  posted_at: string;
  raw: unknown;
}

// ---------------------------------------------------------------------------
// Helpers — provider-specific fetch & normalise
// ---------------------------------------------------------------------------

async function fetchGreenhouseJobs(): Promise<RawGreenhouseJob[]> {
  if (!GREENHOUSE_API_KEY) return [];
  try {
    const res = await fetch(
      `https://harvest.greenhouse.io/v1/jobs?per_page=500`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${GREENHOUSE_API_KEY}:`).toString('base64')}`,
        },
      },
    );
    if (!res.ok) {
      console.error(`[ingest_jobs] Greenhouse fetch failed: ${res.status}`);
      return [];
    }
    return (await res.json()) as RawGreenhouseJob[];
  } catch (err) {
    console.error('[ingest_jobs] Greenhouse fetch error', err);
    return [];
  }
}

async function fetchLeverJobs(): Promise<RawLeverJob[]> {
  if (!LEVER_API_KEY) return [];
  try {
    const res = await fetch(
      `https://api.lever.co/v1/postings?state=published&limit=500`,
      {
        headers: { Authorization: `Bearer ${LEVER_API_KEY}` },
      },
    );
    if (!res.ok) {
      console.error(`[ingest_jobs] Lever fetch failed: ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { data: RawLeverJob[] };
    return body.data ?? [];
  } catch (err) {
    console.error('[ingest_jobs] Lever fetch error', err);
    return [];
  }
}

async function fetchWorkdayJobs(): Promise<RawWorkdayJob[]> {
  if (!WORKDAY_TENANT) return [];
  try {
    const res = await fetch(
      `https://${WORKDAY_TENANT}.wd1.myworkdayjobs.com/wday/cxs/${WORKDAY_TENANT}/External/jobs`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 500, offset: 0 }) },
    );
    if (!res.ok) {
      console.error(`[ingest_jobs] Workday fetch failed: ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { jobPostings: RawWorkdayJob[] };
    return body.jobPostings ?? [];
  } catch (err) {
    console.error('[ingest_jobs] Workday fetch error', err);
    return [];
  }
}

async function fetchIndeedJobs(): Promise<RawIndeedJob[]> {
  if (!INDEED_PUBLISHER_ID) return [];
  try {
    const res = await fetch(
      `https://api.indeed.com/ads/apisearch?publisher=${INDEED_PUBLISHER_ID}&v=2&format=json&limit=25`,
    );
    if (!res.ok) {
      console.error(`[ingest_jobs] Indeed fetch failed: ${res.status}`);
      return [];
    }
    const body = (await res.json()) as { results: RawIndeedJob[] };
    return body.results ?? [];
  } catch (err) {
    console.error('[ingest_jobs] Indeed fetch error', err);
    return [];
  }
}

function normaliseGreenhouseJob(j: RawGreenhouseJob): NormalisedJob {
  return {
    external_id: `greenhouse-${j.id}`,
    source: 'greenhouse',
    title: j.title,
    company: j.company_name,
    company_id: null,
    location: j.location?.name ?? null,
    remote:
      (j.metadata ?? []).some(
        (m) => m.name.toLowerCase() === 'remote' && m.value != null,
      ) ||
      (j.location?.name ?? '').toLowerCase().includes('remote'),
    apply_url: j.absolute_url,
    posted_at: j.updated_at,
    raw: j,
  };
}

function normaliseLeverJob(j: RawLeverJob): NormalisedJob {
  return {
    external_id: `lever-${j.id}`,
    source: 'lever',
    title: j.text,
    company: j.company,
    company_id: null,
    location: j.categories.location ?? null,
    remote: j.workplaceType === 'remote',
    apply_url: j.hostedUrl,
    posted_at: new Date(j.createdAt).toISOString(),
    raw: j,
  };
}

function normaliseWorkdayJob(j: RawWorkdayJob): NormalisedJob {
  return {
    external_id: `workday-${j.jobReqId}`,
    source: 'workday',
    title: j.title,
    company: j.company,
    company_id: null,
    location: j.primaryLocation?.descriptor ?? null,
    remote: j.remoteEligible ?? false,
    apply_url: j.externalUrl,
    posted_at: j.postedOn,
    raw: j,
  };
}

function normaliseIndeedJob(j: RawIndeedJob): NormalisedJob {
  const location = [j.city, j.country].filter(Boolean).join(', ') || null;
  return {
    external_id: `indeed-${j.jobkey}`,
    source: 'indeed',
    title: j.jobtitle,
    company: j.company,
    company_id: null,
    location,
    remote: (j.city ?? '').toLowerCase().includes('remote'),
    apply_url: j.url,
    posted_at: new Date().toISOString(),
    raw: j,
  };
}

// ---------------------------------------------------------------------------
// Auth gate
// ---------------------------------------------------------------------------

/**
 * Returns true when the invocation is permitted to run ingestion.
 *
 * Two paths are accepted:
 *
 * 1. Netlify scheduler — the cron infrastructure POSTs a JSON body containing
 *    a `next_run` ISO-date string. We detect this and allow it through because
 *    Netlify's v1 Handler API does not support injecting custom headers into
 *    scheduled invocations.
 *
 * 2. Authenticated manual trigger — an `X-Ingestion-Key` header whose value
 *    matches the `INGEST_SECRET` environment variable. Use this for any
 *    out-of-band trigger (CI, admin scripts, etc.).
 *
 * If `INGEST_SECRET` is not configured the function logs a warning and allows
 * all callers through (backward-compatible fallback). Set `INGEST_SECRET` in
 * your Netlify environment variables to enforce the gate.
 */
function isAuthorized(event: HandlerEvent): boolean {
  // Path 1: Netlify scheduler invocation — body is JSON with a "next_run" field.
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body ?? '', 'base64').toString()
      : (event.body ?? '');
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.next_run === 'string') {
        return true;
      }
    }
  } catch {
    // Body is not JSON — fall through to header check.
  }

  // Path 2: Pre-shared key header for non-scheduler invocations.
  // Read from process.env at call-time so the value is always current.
  const ingestSecret = process.env.INGEST_SECRET ?? '';
  if (!ingestSecret) {
    console.warn(
      '[ingest_jobs] INGEST_SECRET env var is not set; the endpoint is ' +
        'unprotected. Add INGEST_SECRET to your Netlify environment variables.',
    );
    return true;
  }

  const providedKey = event.headers['x-ingestion-key'];
  return providedKey === ingestSecret;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
) => {
  if (!isAuthorized(event)) {
    console.warn('[ingest_jobs] Rejected unauthorized invocation from', event.headers['x-forwarded-for'] ?? 'unknown');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const results = {
    greenhouse: { fetched: 0, inserted: 0, errors: 0 },
    lever: { fetched: 0, inserted: 0, errors: 0 },
    workday: { fetched: 0, inserted: 0, errors: 0 },
    indeed: { fetched: 0, inserted: 0, errors: 0 },
  };

  // -------------------------------------------------------------------------
  // Greenhouse ingestion path
  // -------------------------------------------------------------------------

  const rawGreenhouseJobs = await fetchGreenhouseJobs();
  const greenhouseJobs = rawGreenhouseJobs.map(normaliseGreenhouseJob);
  results.greenhouse.fetched = greenhouseJobs.length;

  if (greenhouseJobs.length > 0) {
    // Warm the cache with one query for all distinct company names —
    // subsequent resolveCompanyId() calls inside the loop return cached values.
    await bulkResolveCompanyIds(
      supabase,
      greenhouseJobs.map((j) => j.company),
    );

    const greenhouseToInsert = await Promise.all(
      greenhouseJobs.map(async (j) => ({
        ...j,
        // resolveCompanyId() hits cache (0 extra DB calls) for names resolved
        // above; falls through to fuzzy RPC only for names not matched by the
        // bulk query.
        company_id: await resolveCompanyId(supabase, j.company),
      })),
    );

    const { error: ghError } = await supabase
      .from('job_listings')
      .upsert(greenhouseToInsert, { onConflict: 'external_id' });

    if (ghError) {
      console.error('[ingest_jobs] Greenhouse upsert error', ghError);
      results.greenhouse.errors++;
    } else {
      results.greenhouse.inserted = greenhouseToInsert.length;
    }
  }

  // -------------------------------------------------------------------------
  // Lever ingestion path
  // -------------------------------------------------------------------------

  const rawLeverJobs = await fetchLeverJobs();
  const leverJobs = rawLeverJobs.map(normaliseLeverJob);
  results.lever.fetched = leverJobs.length;

  if (leverJobs.length > 0) {
    await bulkResolveCompanyIds(
      supabase,
      leverJobs.map((j) => j.company),
    );

    const leverToInsert = await Promise.all(
      leverJobs.map(async (j) => ({
        ...j,
        company_id: await resolveCompanyId(supabase, j.company),
      })),
    );

    const { error: lvError } = await supabase
      .from('job_listings')
      .upsert(leverToInsert, { onConflict: 'external_id' });

    if (lvError) {
      console.error('[ingest_jobs] Lever upsert error', lvError);
      results.lever.errors++;
    } else {
      results.lever.inserted = leverToInsert.length;
    }
  }

  // -------------------------------------------------------------------------
  // Workday ingestion path
  // -------------------------------------------------------------------------

  const rawWorkdayJobs = await fetchWorkdayJobs();
  const workdayJobs = rawWorkdayJobs.map(normaliseWorkdayJob);
  results.workday.fetched = workdayJobs.length;

  if (workdayJobs.length > 0) {
    await bulkResolveCompanyIds(
      supabase,
      workdayJobs.map((j) => j.company),
    );

    const workdayToInsert = await Promise.all(
      workdayJobs.map(async (j) => ({
        ...j,
        company_id: await resolveCompanyId(supabase, j.company),
      })),
    );

    const { error: wdError } = await supabase
      .from('job_listings')
      .upsert(workdayToInsert, { onConflict: 'external_id' });

    if (wdError) {
      console.error('[ingest_jobs] Workday upsert error', wdError);
      results.workday.errors++;
    } else {
      results.workday.inserted = workdayToInsert.length;
    }
  }

  // -------------------------------------------------------------------------
  // Indeed ingestion path
  // -------------------------------------------------------------------------

  const rawIndeedJobs = await fetchIndeedJobs();
  const indeedJobs = rawIndeedJobs.map(normaliseIndeedJob);
  results.indeed.fetched = indeedJobs.length;

  if (indeedJobs.length > 0) {
    await bulkResolveCompanyIds(
      supabase,
      indeedJobs.map((j) => j.company),
    );

    const indeedToInsert = await Promise.all(
      indeedJobs.map(async (j) => ({
        ...j,
        company_id: await resolveCompanyId(supabase, j.company),
      })),
    );

    const { error: inError } = await supabase
      .from('job_listings')
      .upsert(indeedToInsert, { onConflict: 'external_id' });

    if (inError) {
      console.error('[ingest_jobs] Indeed upsert error', inError);
      results.indeed.errors++;
    } else {
      results.indeed.inserted = indeedToInsert.length;
    }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  const totalFetched = Object.values(results).reduce((s, r) => s + r.fetched, 0);
  const totalInserted = Object.values(results).reduce((s, r) => s + r.inserted, 0);
  const totalErrors = Object.values(results).reduce((s, r) => s + r.errors, 0);

  console.log(
    `[ingest_jobs] fetched=${totalFetched} inserted=${totalInserted} errors=${totalErrors}`,
    results,
  );

  return {
    statusCode: totalErrors > 0 ? 207 : 200,
    body: JSON.stringify({ fetched: totalFetched, inserted: totalInserted, errors: totalErrors, results }),
  };
};
