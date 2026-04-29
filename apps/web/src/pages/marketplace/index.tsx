import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { FeatureHint } from '@/components/onboarding';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useDebounce } from '@/hooks/useDebounce';
import type { PaginatedListings, ListingType } from '@embr/types';
import { LISTING_CATEGORIES } from '@embr/types';
import { copy } from '@/lib/copy';
import { EmptyListState } from '@/components/ui/EmptyListState';

export default function MarketplacePage() {
  const router = useRouter();
  const { groupId } = router.query;
  const { getListings, loading } = useMarketplace();

  const [result, setResult] = useState<PaginatedListings>({ items: [], hasMore: false, nextCursor: null });
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ListingType | ''>('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Debounce the free-text query to avoid a fetch on every keystroke
  const debouncedQuery = useDebounce(query, 300);

  // cursor is passed explicitly so `load` does not close over `result` state,
  // preventing it from being recreated on every result update.
  const load = useCallback(async (reset: boolean, cursor?: string | null) => {
    const params: any = {};
    if (debouncedQuery) params.q = debouncedQuery;
    if (typeFilter) params.type = typeFilter;
    if (category) params.category = category;
    if (minPrice) params.minPrice = parseFloat(minPrice) * 100;
    if (maxPrice) params.maxPrice = parseFloat(maxPrice) * 100;
    if (groupId) params.groupId = groupId;
    if (!reset && cursor) params.cursor = cursor;

    const data = await getListings(params);
    setResult((prev) => (reset ? data : { ...data, items: [...prev.items, ...data.items] }));
  }, [debouncedQuery, typeFilter, category, minPrice, maxPrice, groupId, getListings]);

  useEffect(() => { load(true); }, [load]);

  return (
    <ProtectedPageShell>
      <FeatureHint
        pageId="marketplace"
        icon="🛒"
        title="Welcome to the Marketplace"
        description="Buy and sell physical goods, digital downloads, and services. Just a 2% platform fee — nothing hidden. Perfect for prints, merch, presets, and more."
      />
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem' }}>{copy.dashboard.marketplace.title}</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--embr-muted-text)', fontSize: '0.95rem' }}>
            {copy.dashboard.marketplace.subtitle}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/marketplace/orders">
            <button type="button" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              My Orders
            </button>
          </Link>
          <Link href={`/marketplace/sell${groupId ? `?groupId=${groupId}` : ''}`}>
            <button type="button" style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700' }}>
              + Sell Something
            </button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search listings..."
          style={{ flex: '1', minWidth: '200px', padding: '0.5rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.875rem', color: 'var(--embr-text)' }}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.875rem' }}>
          <option value="">All Types</option>
          <option value="PHYSICAL">Physical</option>
          <option value="DIGITAL">Digital</option>
          <option value="BUNDLE">Bundle</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.875rem' }}>
          <option value="">All Categories</option>
          {LISTING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min $" style={{ width: '80px', padding: '0.5rem 0.5rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.875rem' }} min="0" />
        <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max $" style={{ width: '80px', padding: '0.5rem 0.5rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.875rem' }} min="0" />
      </div>

      {/* Grid */}
      {loading && result.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--embr-muted-text)' }}>Loading...</div>
      ) : result.items.length === 0 ? (
        <EmptyListState
          icon="🛍️"
          title={copy.emptyStates.noListings}
          description={copy.emptyStates.noListingsDesc}
        >
          <Link href="/marketplace/sell">
            <button
              type="button"
              style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '600' }}
            >
              List an item
            </button>
          </Link>
        </EmptyListState>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {result.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          {result.hasMore && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button type="button" onClick={() => load(false, result.nextCursor)} disabled={loading} style={{ padding: '0.625rem 2rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </ProtectedPageShell>
  );
}
