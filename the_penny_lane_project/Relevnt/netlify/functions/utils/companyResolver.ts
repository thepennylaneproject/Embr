/**
 * netlify/functions/utils/companyResolver.ts
 *
 * Resolves company names to their canonical company IDs in Supabase.
 *
 * Design
 * ------
 * Two module-level data structures track resolution state within a Lambda
 * invocation:
 *
 *   resolvedCache   Map<string, string>  — names resolved to a UUID (via bulk
 *                                          query or RPC). Lookups here skip
 *                                          all DB interaction.
 *
 *   rpcNullSet      Set<string>          — names where the RPC already returned
 *                                          null (definitively unresolvable).
 *                                          Prevents repeated round-trips for
 *                                          names that can't be matched.
 *
 * A name that appears in neither structure is "uncached" and will trigger
 * resolution on the next resolveCompanyId() call.
 *
 * Public API
 * ----------
 *   bulkResolveCompanyIds(supabase, names)
 *     Fires one DB query to resolve many names at once. Warms resolvedCache
 *     for matched names. Names not matched by the bulk equality query remain
 *     uncached so that resolveCompanyId() can try the fuzzy-match RPC for them.
 *     Call this before a batch loop to avoid N per-job RPC round-trips.
 *
 *   resolveCompanyId(supabase, name)
 *     Returns the UUID for a single name.
 *     1. Hit: resolvedCache → return UUID (0 DB calls).
 *     2. Hit: rpcNullSet    → return null (0 DB calls, already known null).
 *     3. Miss               → call fuzzy-match RPC, cache result, return.
 *
 * Fallback behaviour
 * ------------------
 * Names not matched by the bulk query (case-insensitive equality) remain
 * uncached. resolveCompanyId() will call the fuzzy-match RPC for those,
 * preserving fuzzy resolution for names that differ slightly from the
 * canonical DB form (e.g. "Acme, Inc." vs "Acme Inc").
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Module-level resolution state
// ---------------------------------------------------------------------------

/** Maps normalised (lower-cased, trimmed) name → company UUID. */
const resolvedCache = new Map<string, string>();

/**
 * Names where resolve_company_id RPC returned null (or errored).
 * Prevents repeated RPC calls for definitively unresolvable names.
 */
const rpcNullSet = new Set<string>();

interface CompanyRow {
  id: string;
  name: string;
}

/** Normalises a company name for use as a cache key. */
function normalise(name: string): string {
  return name.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves a single company name to its Supabase company UUID.
 *
 * Lookup order:
 *   1. resolvedCache — 0 DB round-trips (UUID already known).
 *   2. rpcNullSet    — 0 DB round-trips (already confirmed unresolvable).
 *   3. Fuzzy-match RPC `resolve_company_id` — 1 round-trip on cache miss.
 *
 * ⚠️  Do NOT call this inside a loop over many jobs without first calling
 *     `bulkResolveCompanyIds` to warm the cache — doing so will fire N
 *     individual RPC round-trips for N distinct uncached names.
 *
 * @param supabase  Authenticated Supabase client.
 * @param name      Company name as it appears in the ingestion source.
 * @returns         Company UUID, or null if the company cannot be resolved.
 */
export async function resolveCompanyId(
  supabase: SupabaseClient,
  name: string,
): Promise<string | null> {
  const key = normalise(name);

  if (resolvedCache.has(key)) {
    return resolvedCache.get(key)!;
  }

  if (rpcNullSet.has(key)) {
    return null;
  }

  // Cache miss — fall through to the fuzzy-match RPC.
  const { data, error } = await supabase.rpc('resolve_company_id', {
    company_name: name,
  });

  if (!error && data != null) {
    const id = data as string;
    resolvedCache.set(key, id);
    return id;
  }

  // RPC returned null or errored — record as unresolvable to avoid retries.
  rpcNullSet.add(key);
  return null;
}

/**
 * Bulk-resolves an array of company names in exactly one DB round-trip and
 * warms the module-level cache for each matched name.
 *
 * The query uses a single `.in()` against the `companies` table.
 * Names not returned by the query are left uncached so that
 * resolveCompanyId() can attempt the fuzzy-match RPC as a fallback.
 *
 * Call this once before processing a batch of jobs to avoid N per-job
 * RPC round-trips: subsequent resolveCompanyId() calls in the loop will
 * hit the cache and fire zero additional DB round-trips for matched names.
 *
 * @param supabase  Authenticated Supabase client.
 * @param names     Array of company name strings from the ingestion source.
 */
export async function bulkResolveCompanyIds(
  supabase: SupabaseClient,
  names: string[],
): Promise<void> {
  if (names.length === 0) return;

  // Deduplicate and exclude names already resolved (UUID or confirmed null).
  const unique = [...new Set(names.map(normalise))];
  const uncached = unique.filter(
    (n) => !resolvedCache.has(n) && !rpcNullSet.has(n),
  );

  if (uncached.length === 0) return;

  // Single query for all uncached names — N names → 1 round-trip.
  const { data, error } = await supabase
    .from('companies')
    .select('id, name')
    .in('name', uncached);

  if (error) {
    console.warn(
      '[companyResolver] bulkResolveCompanyIds query failed — will fall back to per-name RPC',
      error,
    );
    // Leave uncached names uncached; resolveCompanyId will try RPC per name.
    return;
  }

  const rows = (data as CompanyRow[]) ?? [];

  // Populate resolvedCache for matched names.
  // Unmatched names are intentionally left uncached so resolveCompanyId()
  // can try the fuzzy-match RPC for them.
  for (const row of rows) {
    resolvedCache.set(normalise(row.name), row.id);
  }
}

/**
 * Clears all module-level resolution state.
 *
 * Intended for use in tests only. Do not call in production code — the cache
 * is deliberately long-lived within a Lambda invocation.
 */
export function clearCompanyCache(): void {
  resolvedCache.clear();
  rpcNullSet.clear();
}
