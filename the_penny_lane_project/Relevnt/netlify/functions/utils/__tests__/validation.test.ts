/**
 * netlify/functions/utils/__tests__/validation.test.ts
 *
 * Tests that every exported Zod schema in validation.ts correctly enforces
 * DB-aligned constraints (NOT NULL, CHECK enums, url format, uuid format).
 */

import { describe, it, expect } from 'vitest';
import {
  APPLICATION_STATUS,
  ApplicationInsertSchema,
  ApplicationUpdateSchema,
  ResumeInsertSchema,
  ResumeUpdateSchema,
  CoverLetterInsertSchema,
  CoverLetterUpdateSchema,
  ProfileUpdateSchema,
  validate,
} from '../validation';

// Valid RFC 4122 v4 UUIDs for use in tests (version nibble=4, variant nibble=8/9/a/b)
const USER_UUID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_UUID_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RESUME_UUID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

// ---------------------------------------------------------------------------
// validate() helper
// ---------------------------------------------------------------------------

describe('validate()', () => {
  it('returns success:true with parsed data on valid input', () => {
    const result = validate(ResumeInsertSchema, {
      user_id: USER_UUID,
      title: 'My Resume',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('My Resume');
    }
  });

  it('returns success:false with structured errors on invalid input', () => {
    const result = validate(ResumeInsertSchema, { title: 'No user_id here' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain('user_id');
    }
  });
});

// ---------------------------------------------------------------------------
// APPLICATION_STATUS enum guard
// ---------------------------------------------------------------------------

describe('APPLICATION_STATUS', () => {
  it('contains the exact values from the DB CHECK constraint', () => {
    expect(APPLICATION_STATUS).toEqual([
      'applied',
      'reviewing',
      'interviewing',
      'in_review',
      'offer',
      'accepted',
      'rejected',
    ]);
  });
});

// ---------------------------------------------------------------------------
// ApplicationInsertSchema
// ---------------------------------------------------------------------------

describe('ApplicationInsertSchema', () => {
  const valid = {
    user_id: USER_UUID,
    company_name: 'Acme Corp',
    role: 'Engineer',
  };

  it('accepts a minimal valid insert', () => {
    const result = ApplicationInsertSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('defaults status to "applied" when omitted', () => {
    const result = ApplicationInsertSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('applied');
  });

  it('accepts every value in APPLICATION_STATUS', () => {
    for (const status of APPLICATION_STATUS) {
      const result = ApplicationInsertSchema.safeParse({ ...valid, status });
      expect(result.success, `status "${status}" should be valid`).toBe(true);
    }
  });

  it('rejects an invalid status value', () => {
    const result = ApplicationInsertSchema.safeParse({
      ...valid,
      status: 'pending',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing user_id (NOT NULL)', () => {
    const result = ApplicationInsertSchema.safeParse({
      company_name: 'Acme',
      role: 'Dev',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty company_name', () => {
    const result = ApplicationInsertSchema.safeParse({
      ...valid,
      company_name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty role', () => {
    const result = ApplicationInsertSchema.safeParse({ ...valid, role: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid user_id', () => {
    const result = ApplicationInsertSchema.safeParse({
      ...valid,
      user_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a nil-version uuid as user_id', () => {
    const result = ApplicationInsertSchema.safeParse({
      ...valid,
      user_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid url field', () => {
    const result = ApplicationInsertSchema.safeParse({
      ...valid,
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts nullable optional fields as null', () => {
    const result = ApplicationInsertSchema.safeParse({
      ...valid,
      location: null,
      salary: null,
      notes: null,
      url: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ApplicationUpdateSchema
// ---------------------------------------------------------------------------

describe('ApplicationUpdateSchema', () => {
  it('accepts an empty update object', () => {
    expect(ApplicationUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a valid status update', () => {
    const result = ApplicationUpdateSchema.safeParse({ status: 'offer' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid status in an update', () => {
    const result = ApplicationUpdateSchema.safeParse({ status: 'archived' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ResumeInsertSchema
// ---------------------------------------------------------------------------

describe('ResumeInsertSchema', () => {
  const valid = {
    user_id: USER_UUID,
    title: 'Senior Engineer Resume',
  };

  it('accepts a minimal valid insert', () => {
    expect(ResumeInsertSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing user_id (NOT NULL)', () => {
    expect(ResumeInsertSchema.safeParse({ title: 'Resume' }).success).toBe(
      false,
    );
  });

  it('rejects empty title (NOT NULL + min(1))', () => {
    expect(
      ResumeInsertSchema.safeParse({ ...valid, title: '' }).success,
    ).toBe(false);
  });

  it('rejects a malformed file_url', () => {
    expect(
      ResumeInsertSchema.safeParse({ ...valid, file_url: 'not-a-url' }).success,
    ).toBe(false);
  });

  it('accepts a valid HTTPS file_url', () => {
    expect(
      ResumeInsertSchema.safeParse({
        ...valid,
        file_url: 'https://example.com/resume.pdf',
      }).success,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ResumeUpdateSchema
// ---------------------------------------------------------------------------

describe('ResumeUpdateSchema', () => {
  it('accepts an empty update object', () => {
    expect(ResumeUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('rejects empty title when provided', () => {
    expect(ResumeUpdateSchema.safeParse({ title: '' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CoverLetterInsertSchema
// ---------------------------------------------------------------------------

describe('CoverLetterInsertSchema', () => {
  const valid = {
    user_id: USER_UUID,
    title: 'Cover Letter for Acme',
    content: 'Dear Hiring Manager...',
  };

  it('accepts a minimal valid insert', () => {
    expect(CoverLetterInsertSchema.safeParse(valid).success).toBe(true);
  });

  it('defaults ai_generated to false', () => {
    const result = CoverLetterInsertSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ai_generated).toBe(false);
  });

  it('rejects missing user_id (NOT NULL)', () => {
    const result = CoverLetterInsertSchema.safeParse({
      title: 'T',
      content: 'C',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty title (NOT NULL + min(1))', () => {
    expect(
      CoverLetterInsertSchema.safeParse({ ...valid, title: '' }).success,
    ).toBe(false);
  });

  it('rejects empty content (NOT NULL + min(1))', () => {
    expect(
      CoverLetterInsertSchema.safeParse({ ...valid, content: '' }).success,
    ).toBe(false);
  });

  it('accepts optional columns added in 20260226 migration', () => {
    const result = CoverLetterInsertSchema.safeParse({
      ...valid,
      resume_id: RESUME_UUID,
      job_description: 'Build things',
      company_name: 'Acme Corp',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid resume_id', () => {
    const result = CoverLetterInsertSchema.safeParse({
      ...valid,
      resume_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CoverLetterUpdateSchema
// ---------------------------------------------------------------------------

describe('CoverLetterUpdateSchema', () => {
  it('accepts an empty update object', () => {
    expect(CoverLetterUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('rejects empty content when provided', () => {
    expect(CoverLetterUpdateSchema.safeParse({ content: '' }).success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// ProfileUpdateSchema
// ---------------------------------------------------------------------------

describe('ProfileUpdateSchema', () => {
  it('accepts an empty update object', () => {
    expect(ProfileUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('rejects a malformed avatar_url', () => {
    expect(
      ProfileUpdateSchema.safeParse({ avatar_url: 'not-a-url' }).success,
    ).toBe(false);
  });

  it('accepts null avatar_url', () => {
    expect(
      ProfileUpdateSchema.safeParse({ avatar_url: null }).success,
    ).toBe(true);
  });

  it('accepts a valid avatar_url', () => {
    expect(
      ProfileUpdateSchema.safeParse({
        avatar_url: 'https://cdn.example.com/avatar.png',
      }).success,
    ).toBe(true);
  });
});
