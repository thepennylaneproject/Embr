import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { useMarketplace } from '@/hooks/useMarketplace';
import type { PaginatedListings, ListingType } from '@embr/types';
import { LISTING_CATEGORIES } from '@embr/types';

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

  const load = async (reset = true) => {
    const params: any = {};
    if (query) params.q = query;
    if (typeFilter) params.type = typeFilter;
    if (category) params.category = category;
    if (minPrice) params.minPrice = parseFloat(minPrice) * 100;
    if (maxPrice) params.maxPrice = parseFloat(maxPrice) * 100;
    if (groupId) params.groupId = groupId;
    if (!reset && result.nextCursor) params.cursor = result.nextCursor;

    const data = await getListings(params);
    setResult(reset ? data : { ...data, items: [...result.items, ...data.items] });
  };

  useEffect(() => { load(true); }, [query, typeFilter, category, minPrice, maxPrice, groupId]);

  return (
    <ProtectedPageShell>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem' }}>Marketplace</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--embr-muted-text)', fontSize: '0.95rem' }}>
            Buy, sell, and trade with your community. 2% platform fee — nothing hidden.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/marketplace/orders">
            <button style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              My Orders
            </button>
          </Link>
          <Link href={`/marketplace/sell${groupId ? `?groupId=${groupId}` : ''}`}>
            <button style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700' }}>
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
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--embr-muted-text)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛍️</div>
          <p style={{ margin: 0, fontWeight: '600' }}>Nothing to see here yet</p>
          <p style={{ margin: '0.5rem 0 1rem', fontSize: '0.875rem' }}>Be the first to list something!</p>
          <Link href="/marketplace/sell">
            <button style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>List an Item</button>
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {result.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          {result.hasMore && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button onClick={() => load(false)} disabled={loading} style={{ padding: '0.625rem 2rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </ProtectedPageShell>
  );
}
