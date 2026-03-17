/**
 * companyResolver.test.ts
 *
 * Unit tests for companyResolver utilities.
 *
 * Test requirements (from PLP-16):
 *   1. bulkResolveCompanyIds for N distinct names fires exactly 1 DB query.
 *   2. Subsequent resolveCompanyId() calls return cached values without
 *      additional DB round-trips (i.e. rpc() is not called again).
 *   3. Names not matched by the bulk query fall through to null in cache;
 *      resolveCompanyId() fires the RPC as fallback for those names.
 *   4. Already-cached names are skipped by bulkResolveCompanyIds (no extra
 *      DB query fired for names already resolved).
 *   5. Empty name arrays result in zero DB queries.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  resolveCompanyId,
  bulkResolveCompanyIds,
  clearCompanyCache,
} from '../companyResolver';

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

interface MockSupabaseOptions {
  companies?: Array<{ id: string; name: string }>;
  rpcResult?: string | null;
  rpcError?: { message: string } | null;
  fromError?: { message: string } | null;
}

/**
 * Creates a minimal Supabase client mock that:
 *   - Records calls to from() (= table queries) and rpc().
 *   - Returns provided fixture data for .from('companies') queries.
 *   - Returns the provided rpcResult for .rpc('resolve_company_id') calls.
 */
function createMockSupabase(opts: MockSupabaseOptions = {}) {
  const fromCalls: string[] = [];
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];

  const buildFromChain = () => {
    const resolved = {
      data: opts.companies ?? [],
      error: opts.fromError ?? null,
    };

    const chainObj = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      then(
        onfulfilled?: ((value: typeof resolved) => unknown) | null,
        onrejected?: ((reason: unknown) => unknown) | null,
      ) {
        return Promise.resolve(resolved).then(
          onfulfilled ?? undefined,
          onrejected ?? undefined,
        );
      },
    };
    const chain = chainObj as unknown as Record<string, unknown> & PromiseLike<typeof resolved>;
    return chain;
  };

  const supabase = {
    from: vi.fn((table: string) => {
      fromCalls.push(table);
      return buildFromChain();
    }),
    rpc: vi.fn((fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve({
        data: opts.rpcResult ?? null,
        error: opts.rpcError ?? null,
      });
    }),
  };

  return {
    supabase: supabase as unknown as SupabaseClient,
    fromCalls,
    rpcCalls,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMPANIES = [
  { id: 'uuid-acme', name: 'acme corp' },
  { id: 'uuid-globex', name: 'globex' },
  { id: 'uuid-initech', name: 'initech' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Clear the module-level cache between tests so they are independent.
  clearCompanyCache();
});

// ---------------------------------------------------------------------------
// bulkResolveCompanyIds — query count (PLP-16 N+1 regression)
// ---------------------------------------------------------------------------

describe('bulkResolveCompanyIds', () => {
  describe('query count (PLP-16 N+1 regression)', () => {
    it('fires exactly 1 DB query for 10 distinct company names', async () => {
      const names = Array.from({ length: 10 }, (_, i) => `company-${i}`);
      const { supabase, fromCalls } = createMockSupabase({ companies: [] });

      await bulkResolveCompanyIds(supabase, names);

      expect(fromCalls).toHaveLength(1);
      expect(fromCalls[0]).toBe('companies');
    });

    it('fires exactly 1 DB query for 3 company names', async () => {
      const { supabase, fromCalls } = createMockSupabase({
        companies: COMPANIES,
      });

      await bulkResolveCompanyIds(supabase, ['acme corp', 'globex', 'initech']);

      expect(fromCalls).toHaveLength(1);
    });

    it('fires exactly 1 DB query for a single company name', async () => {
      const { supabase, fromCalls } = createMockSupabase({ companies: [] });

      await bulkResolveCompanyIds(supabase, ['only one company']);

      expect(fromCalls).toHaveLength(1);
    });

    it('fires 0 DB queries when the names array is empty', async () => {
      const { supabase, fromCalls } = createMockSupabase({});

      await bulkResolveCompanyIds(supabase, []);

      expect(fromCalls).toHaveLength(0);
    });

    it('deduplicates repeated names — fires only 1 query even with duplicates', async () => {
      const { supabase, fromCalls } = createMockSupabase({ companies: [] });

      await bulkResolveCompanyIds(supabase, [
        'acme corp',
        'acme corp',
        'acme corp',
      ]);

      expect(fromCalls).toHaveLength(1);
    });

    it('fires 0 DB queries when all names are already cached', async () => {
      const { supabase: supabase1, fromCalls: firstCalls } = createMockSupabase({
        companies: COMPANIES,
      });

      // First call warms the cache.
      await bulkResolveCompanyIds(supabase1, ['acme corp', 'globex']);
      expect(firstCalls).toHaveLength(1);

      // Second call with a different client — same module-level cache.
      const { supabase: supabase2, fromCalls: secondCalls } = createMockSupabase({});
      await bulkResolveCompanyIds(supabase2, ['acme corp', 'globex']);

      // Cache was already warm — no new DB queries.
      expect(secondCalls).toHaveLength(0);
    });
  });

  describe('cache population', () => {
    it('caches resolved company IDs so resolveCompanyId skips the RPC', async () => {
      const { supabase, fromCalls, rpcCalls } = createMockSupabase({
        companies: COMPANIES,
      });

      await bulkResolveCompanyIds(supabase, ['acme corp', 'globex', 'initech']);

      // Now resolveCompanyId should hit cache — no RPC calls.
      const id1 = await resolveCompanyId(supabase, 'acme corp');
      const id2 = await resolveCompanyId(supabase, 'globex');
      const id3 = await resolveCompanyId(supabase, 'initech');

      expect(id1).toBe('uuid-acme');
      expect(id2).toBe('uuid-globex');
      expect(id3).toBe('uuid-initech');

      // 1 from() call (bulk) + 0 rpc() calls (all cache hits).
      expect(fromCalls).toHaveLength(1);
      expect(rpcCalls).toHaveLength(0);
    });

    it('caches unmatched names as null so resolveCompanyId uses the RPC fallback', async () => {
      // The DB returns only "acme corp" — "unknown co" is not found.
      const { supabase, rpcCalls } = createMockSupabase({
        companies: [{ id: 'uuid-acme', name: 'acme corp' }],
        rpcResult: 'uuid-rpc-resolved',
      });

      await bulkResolveCompanyIds(supabase, ['acme corp', 'unknown co']);

      // "unknown co" is cached as null; resolveCompanyId should fall through to RPC.
      const id = await resolveCompanyId(supabase, 'unknown co');

      expect(id).toBe('uuid-rpc-resolved');
      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].fn).toBe('resolve_company_id');
      expect(rpcCalls[0].args).toEqual({ company_name: 'unknown co' });
    });

    it('normalises names to lower-case when writing to cache', async () => {
      const { supabase, rpcCalls } = createMockSupabase({
        companies: [{ id: 'uuid-acme', name: 'acme corp' }],
      });

      // Bulk call with mixed-case name.
      await bulkResolveCompanyIds(supabase, ['Acme Corp']);

      // resolveCompanyId with different casing should hit cache.
      const id = await resolveCompanyId(supabase, 'ACME CORP');

      expect(id).toBe('uuid-acme');
      // No RPC call because cache was warm.
      expect(rpcCalls).toHaveLength(0);
    });

    it('only queries uncached names when called a second time with new names', async () => {
      const { supabase: s1, fromCalls: fc1 } = createMockSupabase({
        companies: [{ id: 'uuid-acme', name: 'acme corp' }],
      });
      await bulkResolveCompanyIds(s1, ['acme corp']);
      expect(fc1).toHaveLength(1);

      // Second call adds a new name — should query DB once more for the new name.
      const { supabase: s2, fromCalls: fc2 } = createMockSupabase({
        companies: [{ id: 'uuid-globex', name: 'globex' }],
      });
      await bulkResolveCompanyIds(s2, ['acme corp', 'globex']);

      // Only 'globex' was uncached — exactly 1 query.
      expect(fc2).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('caches names as null and does not throw when the DB query errors', async () => {
      const { supabase, rpcCalls } = createMockSupabase({
        fromError: { message: 'connection refused' },
        rpcResult: 'uuid-from-rpc',
      });

      // Should not throw even though the DB call failed.
      await expect(
        bulkResolveCompanyIds(supabase, ['some company']),
      ).resolves.toBeUndefined();

      // resolveCompanyId should fall through to RPC (cached as null).
      const id = await resolveCompanyId(supabase, 'some company');
      expect(id).toBe('uuid-from-rpc');
      expect(rpcCalls).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// resolveCompanyId — cache behaviour (PLP-16 requirement)
// ---------------------------------------------------------------------------

describe('resolveCompanyId', () => {
  describe('cache behaviour', () => {
    it('fires the RPC on first call (cache miss)', async () => {
      const { supabase, rpcCalls } = createMockSupabase({
        rpcResult: 'uuid-from-rpc',
      });

      const id = await resolveCompanyId(supabase, 'new company');

      expect(id).toBe('uuid-from-rpc');
      expect(rpcCalls).toHaveLength(1);
    });

    it('returns cached value without RPC on second call for the same name', async () => {
      const { supabase, rpcCalls } = createMockSupabase({
        rpcResult: 'uuid-from-rpc',
      });

      const id1 = await resolveCompanyId(supabase, 'same company');
      const id2 = await resolveCompanyId(supabase, 'same company');

      expect(id1).toBe('uuid-from-rpc');
      expect(id2).toBe('uuid-from-rpc');
      // Second call must not fire another RPC.
      expect(rpcCalls).toHaveLength(1);
    });

    it('is case-insensitive — same company name in different cases hits the cache', async () => {
      const { supabase, rpcCalls } = createMockSupabase({
        rpcResult: 'uuid-from-rpc',
      });

      await resolveCompanyId(supabase, 'Acme Corp');
      const id = await resolveCompanyId(supabase, 'ACME CORP');

      expect(id).toBe('uuid-from-rpc');
      expect(rpcCalls).toHaveLength(1);
    });

    it('returns null and caches null when the RPC returns null', async () => {
      const { supabase, rpcCalls } = createMockSupabase({ rpcResult: null });

      const id1 = await resolveCompanyId(supabase, 'nonexistent co');
      const id2 = await resolveCompanyId(supabase, 'nonexistent co');

      expect(id1).toBeNull();
      expect(id2).toBeNull();
      expect(rpcCalls).toHaveLength(1);
    });

    it('returns null and caches null when the RPC errors', async () => {
      const { supabase, rpcCalls } = createMockSupabase({
        rpcError: { message: 'function not found' },
      });

      const id = await resolveCompanyId(supabase, 'bad company');
      expect(id).toBeNull();
      expect(rpcCalls).toHaveLength(1);
    });

    it('subsequent resolveCompanyId calls after bulkResolveCompanyIds fire 0 RPC calls', async () => {
      const { supabase, rpcCalls, fromCalls } = createMockSupabase({
        companies: COMPANIES,
      });

      // Warm cache for 3 companies with 1 query.
      await bulkResolveCompanyIds(supabase, ['acme corp', 'globex', 'initech']);

      // 3 resolveCompanyId calls — all should hit cache.
      await resolveCompanyId(supabase, 'acme corp');
      await resolveCompanyId(supabase, 'globex');
      await resolveCompanyId(supabase, 'initech');

      expect(fromCalls).toHaveLength(1); // bulk query only
      expect(rpcCalls).toHaveLength(0);  // zero RPC calls
    });
  });
});

// ---------------------------------------------------------------------------
// clearCompanyCache
// ---------------------------------------------------------------------------

describe('clearCompanyCache', () => {
  it('clears the cache so the next resolveCompanyId fires a fresh RPC', async () => {
    const { supabase: s1, rpcCalls: rc1 } = createMockSupabase({
      rpcResult: 'uuid-1',
    });
    await resolveCompanyId(s1, 'my company');
    expect(rc1).toHaveLength(1);

    clearCompanyCache();

    const { supabase: s2, rpcCalls: rc2 } = createMockSupabase({
      rpcResult: 'uuid-2',
    });
    const id = await resolveCompanyId(s2, 'my company');
    expect(rc2).toHaveLength(1);
    expect(id).toBe('uuid-2');
  });
});
