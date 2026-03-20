/**
 * netlify/functions/utils/validation.ts
 *
 * Zod schemas for all DB-facing write payloads (non-job tables).
 *
 * Each schema mirrors the corresponding Supabase table's CHECK constraints,
 * NOT NULL rules, and column types as defined in:
 *   supabase/migrations/20260129000000_complete_baseline.sql
 *   supabase/migrations/20260226000000_cover_letters_add_missing_columns.sql
 *
 * Enum constants are the single source of truth for allowed values — they
 * must stay in sync with the CHECK constraints in the migration files.
 * When adding a new status value, update both the migration constraint and
 * the corresponding const array here.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enum constants — mirrors DB CHECK constraints
// ---------------------------------------------------------------------------

/**
 * Canonical set of application status values.
 *
 * DB constraint (applications.status):
 *   CHECK (status IN ('applied','reviewing','interviewing','in_review','offer','accepted','rejected'))
 *
 * Source: supabase/migrations/20260129000000_complete_baseline.sql
 */
export const APPLICATION_STATUS = [
  'applied',
  'reviewing',
  'interviewing',
  'in_review',
  'offer',
  'accepted',
  'rejected',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS)[number];

// ---------------------------------------------------------------------------
// profiles schemas
// ---------------------------------------------------------------------------

/**
 * Writable fields for a profile update.
 * `id` and `email` are identity fields and must not be changed via API.
 * `created_at` is server-managed.
 */
export const ProfileUpdateSchema = z.object({
  full_name: z.string().min(1).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  updated_at: z.string().datetime().optional(),
});

export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

// ---------------------------------------------------------------------------
// resumes schemas
// ---------------------------------------------------------------------------

/**
 * Required fields for inserting a new resume row.
 *
 * DB constraints:
 *   - user_id   NOT NULL (FK → profiles.id)
 *   - title     NOT NULL
 */
export const ResumeInsertSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().nullable().optional(),
  file_url: z.string().url().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type ResumeInsert = z.infer<typeof ResumeInsertSchema>;

export const ResumeUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().nullable().optional(),
  file_url: z.string().url().nullable().optional(),
  updated_at: z.string().datetime().optional(),
});

export type ResumeUpdate = z.infer<typeof ResumeUpdateSchema>;

// ---------------------------------------------------------------------------
// applications schemas
// ---------------------------------------------------------------------------

/**
 * Required fields for inserting a new application row.
 *
 * DB constraints:
 *   - user_id      NOT NULL (FK → profiles.id)
 *   - company_name NOT NULL
 *   - role         NOT NULL
 *   - status       NOT NULL DEFAULT 'applied'
 *                  CHECK (status IN ('applied','reviewing','interviewing',
 *                                    'in_review','offer','accepted','rejected'))
 *
 * Source: supabase/migrations/20260129000000_complete_baseline.sql
 */
export const ApplicationInsertSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  company_name: z.string().min(1),
  role: z.string().min(1),
  status: z.enum(APPLICATION_STATUS).default('applied'),
  applied_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  location: z.string().nullable().optional(),
  salary: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
});

export type ApplicationInsert = z.infer<typeof ApplicationInsertSchema>;

export const ApplicationUpdateSchema = z.object({
  company_name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  status: z.enum(APPLICATION_STATUS).optional(),
  location: z.string().nullable().optional(),
  salary: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  updated_at: z.string().datetime().optional(),
});

export type ApplicationUpdate = z.infer<typeof ApplicationUpdateSchema>;

// ---------------------------------------------------------------------------
// cover_letters schemas
// ---------------------------------------------------------------------------

/**
 * Required fields for inserting a new cover letter row.
 *
 * DB constraints:
 *   - user_id      NOT NULL (FK → profiles.id)
 *   - title        NOT NULL
 *   - content      NOT NULL
 *   - ai_generated NOT NULL DEFAULT false
 *
 * Optional FK columns added by migration 20260226000000:
 *   - resume_id    (FK → resumes.id, nullable)
 *   - job_description (nullable text)
 *   - company_name   (nullable text)
 *
 * Source: supabase/migrations/20260129000000_complete_baseline.sql
 *         supabase/migrations/20260226000000_cover_letters_add_missing_columns.sql
 */
export const CoverLetterInsertSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  application_id: z.string().uuid().nullable().optional(),
  job_id: z.string().nullable().optional(),
  title: z.string().min(1),
  content: z.string().min(1),
  ai_generated: z.boolean().default(false),
  template_used: z.string().nullable().optional(),
  resume_id: z.string().uuid().nullable().optional(),
  job_description: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type CoverLetterInsert = z.infer<typeof CoverLetterInsertSchema>;

export const CoverLetterUpdateSchema = z.object({
  application_id: z.string().uuid().nullable().optional(),
  job_id: z.string().nullable().optional(),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  ai_generated: z.boolean().optional(),
  template_used: z.string().nullable().optional(),
  resume_id: z.string().uuid().nullable().optional(),
  job_description: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  updated_at: z.string().datetime().optional(),
});

export type CoverLetterUpdate = z.infer<typeof CoverLetterUpdateSchema>;

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  errors: Array<{ path: string; message: string }>;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Parses `input` against `schema` and returns a typed result object.
 *
 * On failure, returns a structured error list suitable for logging or API
 * error responses — never throws.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}
