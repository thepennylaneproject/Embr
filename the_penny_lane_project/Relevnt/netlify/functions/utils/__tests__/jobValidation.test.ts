/**
 * netlify/functions/utils/__tests__/jobValidation.test.ts
 *
 * Tests that every exported Zod schema in jobValidation.ts correctly enforces
 * DB-aligned constraints, with particular focus on the enum values that caused
 * the data-constraint-violation-001 bug (auto_apply_queue.status mismatch).
 */

import { describe, it, expect } from 'vitest';
import {
  AUTO_APPLY_QUEUE_STATUS,
  JOB_LISTING_STATUS,
  JOB_LISTING_SOURCE,
  PROVIDER_HEALTH_STATUS,
  NormalisedJobInsertSchema,
  AutoApplyQueueInsertSchema,
  AutoApplyQueueStatusUpdateSchema,
  ProviderHealthUpsertSchema,
  AtsDetectionCacheUpsertSchema,
  MatchJobsRequestSchema,
  validateNormalisedJobInsert,
  validateAutoApplyQueueStatusUpdate,
  validateProviderHealthUpsert,
  validateMatchJobsRequest,
} from '../jobValidation';

// Valid RFC 4122 v4 UUIDs (version nibble=4, variant nibble=8/9/a/b)
const USER_UUID_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_UUID_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// ---------------------------------------------------------------------------
// Enum constants — contract tests
// ---------------------------------------------------------------------------

describe('AUTO_APPLY_QUEUE_STATUS', () => {
  it('contains the complete canonical set from the fix migration', () => {
    // Source: supabase/migrations/20260316000000_fix_auto_apply_queue_status_constraint.sql
    expect(AUTO_APPLY_QUEUE_STATUS).toEqual([
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'paused',
      'retry_scheduled',
      'expired',
    ]);
  });

  it('includes the three values added in 20260131005000 (the bug-source migration)', () => {
    expect(AUTO_APPLY_QUEUE_STATUS).toContain('paused');
    expect(AUTO_APPLY_QUEUE_STATUS).toContain('retry_scheduled');
    expect(AUTO_APPLY_QUEUE_STATUS).toContain('expired');
  });
});

describe('JOB_LISTING_STATUS', () => {
  it('contains open, closed, and expired', () => {
    expect(JOB_LISTING_STATUS).toContain('open');
    expect(JOB_LISTING_STATUS).toContain('closed');
    expect(JOB_LISTING_STATUS).toContain('expired');
  });
});

describe('JOB_LISTING_SOURCE', () => {
  it('contains all four known provider sources', () => {
    expect(JOB_LISTING_SOURCE).toEqual(['greenhouse', 'lever', 'workday', 'indeed']);
  });
});

describe('PROVIDER_HEALTH_STATUS', () => {
  it('contains the exact values from the DB CHECK constraint', () => {
    // Source: netlify/functions/migrations/20260206_add_shared_state_tables.sql
    //         supabase/migrations/20260316000000_provider_health_ats_rls.sql
    expect(PROVIDER_HEALTH_STATUS).toEqual([
      'healthy',
      'degraded',
      'down',
      'unknown',
    ]);
  });
});

// ---------------------------------------------------------------------------
// NormalisedJobInsertSchema
// ---------------------------------------------------------------------------

describe('NormalisedJobInsertSchema', () => {
  const valid = {
    external_id: 'greenhouse-12345',
    source: 'greenhouse',
    title: 'Senior Engineer',
    company: 'Acme Corp',
    company_id: null,
    location: 'Remote',
    remote: true,
    apply_url: 'https://jobs.example.com/12345',
    posted_at: '2026-03-01T00:00:00.000Z',
  };

  it('accepts a valid normalised job insert', () => {
    expect(NormalisedJobInsertSchema.safeParse(valid).success).toBe(true);
  });

  it('defaults status to "open"', () => {
    const result = NormalisedJobInsertSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('open');
  });

  it('accepts every known source', () => {
    for (const source of JOB_LISTING_SOURCE) {
      const result = NormalisedJobInsertSchema.safeParse({
        ...valid,
        external_id: `${source}-1`,
        source,
      });
      expect(result.success, `source "${source}" should be valid`).toBe(true);
    }
  });

  it('rejects an unknown source value', () => {
    const result = NormalisedJobInsertSchema.safeParse({
      ...valid,
      source: 'linkedin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty external_id', () => {
    expect(
      NormalisedJobInsertSchema.safeParse({ ...valid, external_id: '' }).success,
    ).toBe(false);
  });

  it('rejects a malformed apply_url', () => {
    expect(
      NormalisedJobInsertSchema.safeParse({
        ...valid,
        apply_url: 'not-a-url',
      }).success,
    ).toBe(false);
  });

  it('rejects a malformed posted_at (not ISO datetime)', () => {
    expect(
      NormalisedJobInsertSchema.safeParse({
        ...valid,
        posted_at: '2026-03-01',
      }).success,
    ).toBe(false);
  });

  it('rejects an invalid status value', () => {
    expect(
      NormalisedJobInsertSchema.safeParse({ ...valid, status: 'draft' }).success,
    ).toBe(false);
  });

  it('rejects a negative salary_min', () => {
    expect(
      NormalisedJobInsertSchema.safeParse({ ...valid, salary_min: -1 }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateNormalisedJobInsert helper
// ---------------------------------------------------------------------------

describe('validateNormalisedJobInsert()', () => {
  it('returns success with typed data for a valid payload', () => {
    const result = validateNormalisedJobInsert({
      external_id: 'lever-abc',
      source: 'lever',
      title: 'PM',
      company: 'Widget Co',
      company_id: null,
      location: null,
      remote: false,
      apply_url: 'https://jobs.widget.co/pm',
      posted_at: '2026-01-15T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('returns failure with structured errors for an invalid payload', () => {
    const result = validateNormalisedJobInsert({ source: 'unknown' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// AutoApplyQueueInsertSchema
// ---------------------------------------------------------------------------

describe('AutoApplyQueueInsertSchema', () => {
  const valid = {
    user_id: USER_UUID_1,
  };

  it('accepts a minimal valid insert', () => {
    expect(AutoApplyQueueInsertSchema.safeParse(valid).success).toBe(true);
  });

  it('defaults status to "pending"', () => {
    const result = AutoApplyQueueInsertSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('pending');
  });

  it('defaults max_retries to 3', () => {
    const result = AutoApplyQueueInsertSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.max_retries).toBe(3);
  });

  it('accepts every value in AUTO_APPLY_QUEUE_STATUS', () => {
    for (const status of AUTO_APPLY_QUEUE_STATUS) {
      const result = AutoApplyQueueInsertSchema.safeParse({ ...valid, status });
      expect(result.success, `status "${status}" should be valid`).toBe(true);
    }
  });

  it('rejects a status not in the DB CHECK constraint', () => {
    expect(
      AutoApplyQueueInsertSchema.safeParse({ ...valid, status: 'queued' })
        .success,
    ).toBe(false);
  });

  it('rejects missing user_id (NOT NULL)', () => {
    expect(AutoApplyQueueInsertSchema.safeParse({}).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AutoApplyQueueStatusUpdateSchema — the fix for data-constraint-violation-001
// ---------------------------------------------------------------------------

describe('AutoApplyQueueStatusUpdateSchema', () => {
  it('accepts every value in AUTO_APPLY_QUEUE_STATUS', () => {
    for (const status of AUTO_APPLY_QUEUE_STATUS) {
      const result = AutoApplyQueueStatusUpdateSchema.safeParse({ status });
      expect(result.success, `status "${status}" should be accepted`).toBe(
        true,
      );
    }
  });

  it('explicitly accepts the three values that caused data-constraint-violation-001', () => {
    const newStatuses = ['paused', 'retry_scheduled', 'expired'] as const;
    for (const status of newStatuses) {
      const result = AutoApplyQueueStatusUpdateSchema.safeParse({ status });
      expect(
        result.success,
        `"${status}" must be valid (was missing from old validator)`,
      ).toBe(true);
    }
  });

  it('rejects a status value not in the DB CHECK constraint', () => {
    expect(
      AutoApplyQueueStatusUpdateSchema.safeParse({ status: 'queued' }).success,
    ).toBe(false);
  });

  it('rejects a missing status field', () => {
    expect(
      AutoApplyQueueStatusUpdateSchema.safeParse({}).success,
    ).toBe(false);
  });

  it('accepts a paused status with a paused_at timestamp', () => {
    const result = AutoApplyQueueStatusUpdateSchema.safeParse({
      status: 'paused',
      paused_at: '2026-03-01T12:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a retry_scheduled status with a scheduled_retry_at timestamp', () => {
    const result = AutoApplyQueueStatusUpdateSchema.safeParse({
      status: 'retry_scheduled',
      scheduled_retry_at: '2026-03-02T08:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateAutoApplyQueueStatusUpdate helper
// ---------------------------------------------------------------------------

describe('validateAutoApplyQueueStatusUpdate()', () => {
  it('returns success for a valid status update', () => {
    const result = validateAutoApplyQueueStatusUpdate({ status: 'processing' });
    expect(result.success).toBe(true);
  });

  it('returns failure for an invalid status update', () => {
    const result = validateAutoApplyQueueStatusUpdate({ status: 'on_hold' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ProviderHealthUpsertSchema
// ---------------------------------------------------------------------------

describe('ProviderHealthUpsertSchema', () => {
  const valid = {
    provider_name: 'greenhouse',
    status: 'healthy',
  };

  it('accepts a minimal valid upsert', () => {
    expect(ProviderHealthUpsertSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts every value in PROVIDER_HEALTH_STATUS', () => {
    for (const status of PROVIDER_HEALTH_STATUS) {
      const result = ProviderHealthUpsertSchema.safeParse({ ...valid, status });
      expect(result.success, `status "${status}" should be valid`).toBe(true);
    }
  });

  it('rejects an invalid status', () => {
    expect(
      ProviderHealthUpsertSchema.safeParse({ ...valid, status: 'ok' }).success,
    ).toBe(false);
  });

  it('rejects empty provider_name', () => {
    expect(
      ProviderHealthUpsertSchema.safeParse({ ...valid, provider_name: '' })
        .success,
    ).toBe(false);
  });

  it('rejects a negative response_time_ms', () => {
    expect(
      ProviderHealthUpsertSchema.safeParse({ ...valid, response_time_ms: -1 })
        .success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateProviderHealthUpsert helper
// ---------------------------------------------------------------------------

describe('validateProviderHealthUpsert()', () => {
  it('returns success for a valid upsert', () => {
    const result = validateProviderHealthUpsert({
      provider_name: 'lever',
      status: 'degraded',
    });
    expect(result.success).toBe(true);
  });

  it('returns failure for an unknown status', () => {
    const result = validateProviderHealthUpsert({
      provider_name: 'lever',
      status: 'slow',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AtsDetectionCacheUpsertSchema
// ---------------------------------------------------------------------------

describe('AtsDetectionCacheUpsertSchema', () => {
  it('accepts a minimal valid upsert', () => {
    expect(
      AtsDetectionCacheUpsertSchema.safeParse({ job_listing_id: 'gh-123' })
        .success,
    ).toBe(true);
  });

  it('accepts a confidence_score of 0.0', () => {
    expect(
      AtsDetectionCacheUpsertSchema.safeParse({
        job_listing_id: 'gh-123',
        confidence_score: 0,
      }).success,
    ).toBe(true);
  });

  it('accepts a confidence_score of 1.0', () => {
    expect(
      AtsDetectionCacheUpsertSchema.safeParse({
        job_listing_id: 'gh-123',
        confidence_score: 1,
      }).success,
    ).toBe(true);
  });

  it('rejects a confidence_score above 1.0', () => {
    expect(
      AtsDetectionCacheUpsertSchema.safeParse({
        job_listing_id: 'gh-123',
        confidence_score: 1.1,
      }).success,
    ).toBe(false);
  });

  it('rejects a confidence_score below 0.0', () => {
    expect(
      AtsDetectionCacheUpsertSchema.safeParse({
        job_listing_id: 'gh-123',
        confidence_score: -0.1,
      }).success,
    ).toBe(false);
  });

  it('rejects empty job_listing_id', () => {
    expect(
      AtsDetectionCacheUpsertSchema.safeParse({ job_listing_id: '' }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MatchJobsRequestSchema
// ---------------------------------------------------------------------------

describe('MatchJobsRequestSchema', () => {
  it('accepts a valid request with UUID user IDs', () => {
    const result = MatchJobsRequestSchema.safeParse({
      userIds: [USER_UUID_1, USER_UUID_2],
    });
    expect(result.success).toBe(true);
  });

  it('defaults scoreThreshold to 0 when omitted', () => {
    const result = MatchJobsRequestSchema.safeParse({
      userIds: [USER_UUID_1],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.scoreThreshold).toBe(0);
  });

  it('accepts an explicit scoreThreshold', () => {
    const result = MatchJobsRequestSchema.safeParse({
      userIds: [USER_UUID_1],
      scoreThreshold: 0.75,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.scoreThreshold).toBe(0.75);
  });

  it('rejects an empty userIds array', () => {
    const result = MatchJobsRequestSchema.safeParse({ userIds: [] });
    expect(result.success).toBe(false);
  });

  it('rejects a non-array userIds', () => {
    const result = MatchJobsRequestSchema.safeParse({
      userIds: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a userIds array containing non-UUID strings', () => {
    const result = MatchJobsRequestSchema.safeParse({
      userIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a scoreThreshold above 1', () => {
    const result = MatchJobsRequestSchema.safeParse({
      userIds: [USER_UUID_1],
      scoreThreshold: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a scoreThreshold below 0', () => {
    const result = MatchJobsRequestSchema.safeParse({
      userIds: [USER_UUID_1],
      scoreThreshold: -0.1,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateMatchJobsRequest helper
// ---------------------------------------------------------------------------

describe('validateMatchJobsRequest()', () => {
  it('returns success for a valid request body', () => {
    const result = validateMatchJobsRequest({
      userIds: [USER_UUID_1],
      scoreThreshold: 0.5,
    });
    expect(result.success).toBe(true);
  });

  it('returns failure with details when userIds is missing', () => {
    const result = validateMatchJobsRequest({ scoreThreshold: 0.5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain('userIds');
    }
  });
});
