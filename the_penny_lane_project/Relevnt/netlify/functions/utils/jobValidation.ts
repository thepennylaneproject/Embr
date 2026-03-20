/**
 * netlify/functions/utils/jobValidation.ts
 *
 * Zod schemas for job-pipeline DB write payloads.
 *
 * Covers the tables touched by Netlify background functions:
 *   - job_listings      (written by ingest_jobs)
 *   - auto_apply_queue  (written by auto-apply pipeline)
 *   - provider_health   (written by provider health monitor)
 *   - ats_detection_cache (written by ATS fingerprinting)
 *
 * Each schema mirrors the corresponding Supabase table's CHECK constraints,
 * NOT NULL rules, and column types as defined in:
 *   netlify/functions/migrations/20260206_add_shared_state_tables.sql
 *   supabase/migrations/20260129000000_complete_baseline.sql
 *   supabase/migrations/20260131005000_medium_priority_bugs_fix.sql
 *   supabase/migrations/20260316000000_fix_auto_apply_queue_status_constraint.sql
 *   supabase/migrations/20260316000000_provider_health_ats_rls.sql
 *
 * Enum constants are the single source of truth for allowed values — they
 * must stay in sync with the CHECK constraints in the migration files.
 * When adding a new status value, update both the migration constraint and
 * the corresponding const array here.
 */

import { z } from 'zod';
import { type ValidationResult, validate } from './validation';

// ---------------------------------------------------------------------------
// Enum constants — mirrors DB CHECK constraints
// ---------------------------------------------------------------------------

/**
 * Canonical set of auto_apply_queue status values.
 *
 * DB constraint (auto_apply_queue.status):
 *   CHECK (status IN (
 *     'pending', 'processing', 'completed', 'failed', 'cancelled',
 *     'paused', 'retry_scheduled', 'expired'
 *   ))
 *
 * Original values ('pending'–'cancelled'):
 *   supabase/migrations/20260129000000_complete_baseline.sql
 * Extended values ('paused', 'retry_scheduled', 'expired') and constraint fix:
 *   supabase/migrations/20260131005000_medium_priority_bugs_fix.sql
 *   supabase/migrations/20260316000000_fix_auto_apply_queue_status_constraint.sql
 */
export const AUTO_APPLY_QUEUE_STATUS = [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'paused',
  'retry_scheduled',
  'expired',
] as const;

export type AutoApplyQueueStatus = (typeof AUTO_APPLY_QUEUE_STATUS)[number];

/**
 * Canonical set of job_listing status values.
 *
 * DB constraint: inferred from usage — status values observed across codebase.
 * Source: job_alerts.ts, match_jobs.ts (.eq('status', 'open'))
 */
export const JOB_LISTING_STATUS = ['open', 'closed', 'expired'] as const;

export type JobListingStatus = (typeof JOB_LISTING_STATUS)[number];

/**
 * Canonical set of known job ingestion source names.
 *
 * Source: netlify/functions/ingest_jobs.ts normalise* functions.
 */
export const JOB_LISTING_SOURCE = [
  'greenhouse',
  'lever',
  'workday',
  'indeed',
] as const;

export type JobListingSource = (typeof JOB_LISTING_SOURCE)[number];

/**
 * Canonical set of provider_health status values.
 *
 * DB constraint (provider_health.status):
 *   CHECK (status IN ('healthy', 'degraded', 'down', 'unknown'))
 *
 * Source:
 *   netlify/functions/migrations/20260206_add_shared_state_tables.sql
 *   supabase/migrations/20260316000000_provider_health_ats_rls.sql
 */
export const PROVIDER_HEALTH_STATUS = [
  'healthy',
  'degraded',
  'down',
  'unknown',
] as const;

export type ProviderHealthStatus = (typeof PROVIDER_HEALTH_STATUS)[number];

// ---------------------------------------------------------------------------
// job_listings schemas
// ---------------------------------------------------------------------------

/**
 * Schema for a normalised job listing upsert into the `job_listings` table.
 *
 * DB constraints:
 *   - external_id  NOT NULL (UNIQUE — conflict target for upsert)
 *   - source       NOT NULL
 *   - title        NOT NULL
 *   - company      NOT NULL
 *   - remote       NOT NULL (boolean)
 *   - apply_url    NOT NULL
 *   - posted_at    NOT NULL (timestamptz)
 *
 * Source: netlify/functions/ingest_jobs.ts (NormalisedJob interface + upsert calls)
 */
export const NormalisedJobInsertSchema = z.object({
  external_id: z.string().min(1),
  source: z.enum(JOB_LISTING_SOURCE),
  title: z.string().min(1),
  company: z.string().min(1),
  company_id: z.string().uuid().nullable(),
  location: z.string().nullable(),
  remote: z.boolean(),
  apply_url: z.string().url(),
  posted_at: z.string().datetime(),
  status: z.enum(JOB_LISTING_STATUS).default('open'),
  salary_min: z.number().int().nonnegative().nullable().optional(),
  salary_max: z.number().int().nonnegative().nullable().optional(),
  skills_required: z.array(z.string()).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  raw: z.unknown().optional(),
});

export type NormalisedJobInsert = z.infer<typeof NormalisedJobInsertSchema>;

// ---------------------------------------------------------------------------
// auto_apply_queue schemas
// ---------------------------------------------------------------------------

/**
 * Schema for inserting a new auto_apply_queue row.
 *
 * DB constraints (from baseline + 20260131005000_medium_priority_bugs_fix):
 *   - user_id      NOT NULL
 *   - status       NOT NULL DEFAULT 'pending'
 *                  CHECK (status IN (...AUTO_APPLY_QUEUE_STATUS...))
 *   - max_retries  NOT NULL DEFAULT 3
 */
export const AutoApplyQueueInsertSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  status: z.enum(AUTO_APPLY_QUEUE_STATUS).default('pending'),
  max_retries: z.number().int().nonnegative().default(3),
  paused_at: z.string().datetime().nullable().optional(),
  scheduled_retry_at: z.string().datetime().nullable().optional(),
  expired_at: z.string().datetime().nullable().optional(),
});

export type AutoApplyQueueInsert = z.infer<typeof AutoApplyQueueInsertSchema>;

/**
 * Schema for updating an auto_apply_queue status.
 *
 * Enforces that any status transition uses only the values permitted by the
 * DB CHECK constraint — the source of the data-constraint-violation-001 bug
 * that was caused by using custom validators not tied to the DB constraint.
 *
 * Source: supabase/migrations/20260316000000_fix_auto_apply_queue_status_constraint.sql
 */
export const AutoApplyQueueStatusUpdateSchema = z.object({
  status: z.enum(AUTO_APPLY_QUEUE_STATUS),
  paused_at: z.string().datetime().nullable().optional(),
  scheduled_retry_at: z.string().datetime().nullable().optional(),
  expired_at: z.string().datetime().nullable().optional(),
});

export type AutoApplyQueueStatusUpdate = z.infer<
  typeof AutoApplyQueueStatusUpdateSchema
>;

// ---------------------------------------------------------------------------
// provider_health schemas
// ---------------------------------------------------------------------------

/**
 * Schema for upserting a provider_health row.
 *
 * DB constraints (provider_health table):
 *   - provider_name  NOT NULL (UNIQUE)
 *   - status         NOT NULL DEFAULT 'unknown'
 *                    CHECK (status IN ('healthy','degraded','down','unknown'))
 *   - last_checked_at NOT NULL DEFAULT now()
 *
 * Source:
 *   netlify/functions/migrations/20260206_add_shared_state_tables.sql
 *   supabase/migrations/20260316000000_provider_health_ats_rls.sql
 */
export const ProviderHealthUpsertSchema = z.object({
  provider_name: z.string().min(1),
  status: z.enum(PROVIDER_HEALTH_STATUS),
  last_checked_at: z.string().datetime().optional(),
  response_time_ms: z.number().int().nonnegative().nullable().optional(),
  error_message: z.string().nullable().optional(),
  updated_at: z.string().datetime().optional(),
});

export type ProviderHealthUpsert = z.infer<typeof ProviderHealthUpsertSchema>;

// ---------------------------------------------------------------------------
// ats_detection_cache schemas
// ---------------------------------------------------------------------------

/**
 * Schema for upserting an ats_detection_cache row.
 *
 * DB constraints (ats_detection_cache table):
 *   - job_listing_id  NOT NULL (UNIQUE)
 *   - detected_at     NOT NULL DEFAULT now()
 *   - confidence_score REAL (nullable, must be in [0.0, 1.0] range)
 *
 * Source:
 *   netlify/functions/migrations/20260206_add_shared_state_tables.sql
 *   supabase/migrations/20260316000000_provider_health_ats_rls.sql
 */
export const AtsDetectionCacheUpsertSchema = z.object({
  job_listing_id: z.string().min(1),
  ats_name: z.string().nullable().optional(),
  confidence_score: z.number().min(0).max(1).nullable().optional(),
  raw_signals: z.record(z.unknown()).nullable().optional(),
  detected_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type AtsDetectionCacheUpsert = z.infer<
  typeof AtsDetectionCacheUpsertSchema
>;

// ---------------------------------------------------------------------------
// match_jobs request body schema
// ---------------------------------------------------------------------------

/**
 * Schema for the POST body accepted by the match_jobs Netlify function.
 *
 * Replaces the manual Array.isArray / typeof checks previously inline in
 * netlify/functions/match_jobs.ts.
 */
export const MatchJobsRequestSchema = z.object({
  userIds: z
    .array(z.string().uuid())
    .nonempty({ message: 'userIds must be a non-empty array of UUIDs' }),
  scoreThreshold: z.number().min(0).max(1).optional().default(0),
});

export type MatchJobsRequest = z.infer<typeof MatchJobsRequestSchema>;

// ---------------------------------------------------------------------------
// Typed validation helpers
// ---------------------------------------------------------------------------

/**
 * Validates a normalised job payload before a `job_listings` upsert.
 * Returns a typed result — never throws.
 */
export function validateNormalisedJobInsert(
  input: unknown,
): ValidationResult<NormalisedJobInsert> {
  return validate(NormalisedJobInsertSchema, input);
}

/**
 * Validates an auto_apply_queue status update payload.
 * Returns a typed result — never throws.
 *
 * Use this before every status write to guarantee the value is within
 * the DB CHECK constraint and prevent data-constraint-violation-001.
 */
export function validateAutoApplyQueueStatusUpdate(
  input: unknown,
): ValidationResult<AutoApplyQueueStatusUpdate> {
  return validate(AutoApplyQueueStatusUpdateSchema, input);
}

/**
 * Validates a provider_health upsert payload.
 * Returns a typed result — never throws.
 */
export function validateProviderHealthUpsert(
  input: unknown,
): ValidationResult<ProviderHealthUpsert> {
  return validate(ProviderHealthUpsertSchema, input);
}

/**
 * Validates the match_jobs POST request body.
 * Returns a typed result — never throws.
 */
export function validateMatchJobsRequest(
  input: unknown,
): ValidationResult<MatchJobsRequest> {
  return validate(MatchJobsRequestSchema, input);
}
