/**
 * netlify/functions/__tests__/ingest_jobs.test.ts
 *
 * Unit tests for the ingest_jobs handler auth gate (PLP-166).
 *
 * The tests exercise the isAuthorized logic through the exported handler,
 * mocking all external I/O (Supabase, fetch, companyResolver) so the only
 * code path under test is the authentication check.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HandlerEvent, HandlerContext } from '@netlify/functions';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

vi.mock('../utils/companyResolver', () => ({
  resolveCompanyId: vi.fn().mockResolvedValue(null),
  bulkResolveCompanyIds: vi.fn().mockResolvedValue(undefined),
}));

// Mock global fetch to return empty provider responses so no ingestion runs.
const mockFetch = vi.fn().mockResolvedValue({
  ok: false,
  status: 503,
  json: async () => ({}),
});
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    httpMethod: 'GET',
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    path: '/.netlify/functions/ingest_jobs',
    body: null,
    isBase64Encoded: false,
    rawUrl: '/.netlify/functions/ingest_jobs',
    rawQuery: '',
    ...overrides,
  };
}

const FAKE_CONTEXT = {} as HandlerContext;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ingest_jobs handler — auth gate (PLP-166)', () => {
  const originalSecret = process.env.INGEST_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original env value between tests.
    if (originalSecret === undefined) {
      delete process.env.INGEST_SECRET;
    } else {
      process.env.INGEST_SECRET = originalSecret;
    }
  });

  // -------------------------------------------------------------------------
  // Scenario 1: INGEST_SECRET not configured → backward-compatible allow-all
  // -------------------------------------------------------------------------

  describe('when INGEST_SECRET is not configured', () => {
    beforeEach(() => {
      delete process.env.INGEST_SECRET;
    });

    it('allows requests without any auth header', async () => {
      const { handler } = await import('../ingest_jobs');
      const event = makeEvent();
      const response = await handler(event, FAKE_CONTEXT);
      expect(response?.statusCode).not.toBe(401);
    });

    it('allows requests with arbitrary headers', async () => {
      const { handler } = await import('../ingest_jobs');
      const event = makeEvent({ headers: { 'x-ingestion-key': 'random-value' } });
      const response = await handler(event, FAKE_CONTEXT);
      expect(response?.statusCode).not.toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 2: INGEST_SECRET configured → header required
  // -------------------------------------------------------------------------

  describe('when INGEST_SECRET is configured', () => {
    const SECRET = 'super-secret-ingest-key';

    beforeEach(() => {
      process.env.INGEST_SECRET = SECRET;
    });

    it('rejects requests with no X-Ingestion-Key header', async () => {
      const { handler } = await import('../ingest_jobs');
      const event = makeEvent();
      const response = await handler(event, FAKE_CONTEXT);
      expect(response?.statusCode).toBe(401);
    });

    it('rejects requests with a wrong X-Ingestion-Key header', async () => {
      const { handler } = await import('../ingest_jobs');
      const event = makeEvent({ headers: { 'x-ingestion-key': 'wrong-key' } });
      const response = await handler(event, FAKE_CONTEXT);
      expect(response?.statusCode).toBe(401);
    });

    it('returns a JSON error body on rejection', async () => {
      const { handler } = await import('../ingest_jobs');
      const event = makeEvent();
      const response = await handler(event, FAKE_CONTEXT);
      expect(JSON.parse(response?.body ?? '{}')).toEqual({ error: 'Unauthorized' });
    });

    it('allows requests with the correct X-Ingestion-Key header', async () => {
      const { handler } = await import('../ingest_jobs');
      const event = makeEvent({ headers: { 'x-ingestion-key': SECRET } });
      const response = await handler(event, FAKE_CONTEXT);
      expect(response?.statusCode).not.toBe(401);
    });

    it('rejects requests where the key is a prefix of the secret', async () => {
      const { handler } = await import('../ingest_jobs');
      const event = makeEvent({ headers: { 'x-ingestion-key': SECRET.slice(0, -1) } });
      const response = await handler(event, FAKE_CONTEXT);
      expect(response?.statusCode).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Netlify scheduler invocation — allowed regardless of header
  // -------------------------------------------------------------------------

  describe('Netlify scheduler invocations', () => {
    const SECRET = 'super-secret-ingest-key';

    beforeEach(() => {
      process.env.INGEST_SECRET = SECRET;
    });

    it('allows requests whose body contains a next_run field', async () => {
      const { handler } = await import('../ingest_jobs');
      const event = makeEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ next_run: '2026-03-17T09:00:00.000Z' }),
        headers: {},
      });
      const response = await handler(event, FAKE_CONTEXT);
      expect(response?.statusCode).not.toBe(401);
    });

    it('allows base64-encoded scheduler payloads with next_run', async () => {
      const { handler } = await import('../ingest_jobs');
      const payload = Buffer.from(
        JSON.stringify({ next_run: '2026-03-17T09:00:00.000Z' }),
      ).toString('base64');
      const event = makeEvent({
        httpMethod: 'POST',
        body: payload,
        isBase64Encoded: true,
        headers: {},
      });
      const response = await handler(event, FAKE_CONTEXT);
      expect(response?.statusCode).not.toBe(401);
    });

    it('does NOT allow a body where next_run is not a string', async () => {
      const { handler } = await import('../ingest_jobs');
      const event = makeEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ next_run: 12345 }),
        headers: {},
      });
      const response = await handler(event, FAKE_CONTEXT);
      expect(response?.statusCode).toBe(401);
    });

    it('does NOT allow a non-JSON body as a scheduler bypass', async () => {
      const { handler } = await import('../ingest_jobs');
      const event = makeEvent({
        httpMethod: 'POST',
        body: 'not-json-at-all',
        headers: {},
      });
      const response = await handler(event, FAKE_CONTEXT);
      expect(response?.statusCode).toBe(401);
    });
  });
});
