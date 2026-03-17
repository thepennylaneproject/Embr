import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { MutualAidCard } from '@/components/mutual-aid/MutualAidCard';
import { ResponseModal } from '@/components/mutual-aid/ResponseModal';
import { FeatureHint } from '@/components/onboarding';
import { useMutualAid } from '@/hooks/useMutualAid';
import { useAuth } from '@/contexts/AuthContext';
import type { MutualAidPost, MutualAidCategory, MutualAidType, PaginatedMutualAidPosts } from '@embr/types';
import { MUTUAL_AID_CATEGORY_LABELS, MUTUAL_AID_CATEGORY_ICONS } from '@embr/types';

const CATEGORIES = ['All', ...Object.keys(MUTUAL_AID_CATEGORY_LABELS)] as const;

export default function MutualAidPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { groupId } = router.query;
  const { getPosts, respond, loading } = useMutualAid();

  const [result, setResult] = useState<PaginatedMutualAidPosts>({ items: [], hasMore: false, nextCursor: null });
  const [typeFilter, setTypeFilter] = useState<MutualAidType | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<MutualAidCategory | 'All'>('All');
  const [respondingTo, setRespondingTo] = useState<MutualAidPost | null>(null);
  const [responseLoading, setResponseLoading] = useState(false);

  const load = async (reset = true) => {
    const params: any = {};
    if (typeFilter) params.type = typeFilter;
    if (categoryFilter !== 'All') params.category = categoryFilter;
    if (groupId) params.groupId = groupId;
    if (!reset && result.nextCursor) params.cursor = result.nextCursor;

    const data = await getPosts(params);
    setResult(reset ? data : { ...data, items: [...result.items, ...data.items] });
  };

  useEffect(() => { load(true); }, [typeFilter, categoryFilter, groupId]);

  const handleRespond = async (message: string) => {
    if (!respondingTo) return;
    setResponseLoading(true);
    try {
      await respond(respondingTo.id, message);
      setRespondingTo(null);
      await load(true);
    } finally {
      setResponseLoading(false);
    }
  };

  return (
    <ProtectedPageShell>
      <FeatureHint
        pageId="mutual-aid"
        icon="🤝"
        title="Welcome to Mutual Aid"
        description="Post a request for help or offer support to others in your community. Embr's mutual aid board is for sharing resources, skills, and solidarity."
      />
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem' }}>Mutual Aid</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--embr-muted-text)', fontSize: '0.95rem' }}>
            Give and receive support. Build the community you need.
          </p>
        </div>
        <Link href={`/mutual-aid/post${groupId ? `?groupId=${groupId}` : ''}`}>
          <button style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700' }}>
            + Post Request / Offer
          </button>
        </Link>
      </div>

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { val: '', label: 'All' },
          { val: 'REQUEST', label: '🙏 Needs Help' },
          { val: 'OFFER', label: '🤝 Offering' },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setTypeFilter(val as any)}
            style={{
              padding: '0.4rem 0.875rem',
              borderRadius: '999px',
              border: '1px solid var(--embr-border)',
              background: typeFilter === val ? 'var(--embr-accent)' : 'transparent',
              color: typeFilter === val ? '#fff' : 'var(--embr-text)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: '600',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat as any)}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              border: '1px solid var(--embr-border)',
              background: categoryFilter === cat ? 'var(--embr-warm-1)' : 'transparent',
              color: categoryFilter === cat ? '#fff' : 'var(--embr-text)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {cat !== 'All' ? `${MUTUAL_AID_CATEGORY_ICONS[cat as MutualAidCategory]} ` : ''}{cat === 'All' ? 'All Categories' : MUTUAL_AID_CATEGORY_LABELS[cat as MutualAidCategory]}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading && result.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--embr-muted-text)' }}>Loading...</div>
      ) : result.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--embr-muted-text)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🤝</div>
          <p style={{ margin: 0, fontWeight: '600' }}>Nothing here yet</p>
          <p style={{ margin: '0.5rem 0 1rem', fontSize: '0.875rem' }}>Be the first to post a request or offer!</p>
          <Link href="/mutual-aid/post">
            <button style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Post Now</button>
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {result.items.map((post) => (
              <MutualAidCard
                key={post.id}
                post={post}
                onRespond={(id) => setRespondingTo(result.items.find((p) => p.id === id) || null)}
                currentUserId={user?.id}
              />
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

      {/* Response modal */}
      {respondingTo && (
        <ResponseModal
          postTitle={respondingTo.title}
          onSubmit={handleRespond}
          onClose={() => setRespondingTo(null)}
          loading={responseLoading}
        />
      )}
    </ProtectedPageShell>
  );
}
