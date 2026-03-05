import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { GroupCard } from '@/components/groups/GroupCard';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/contexts/AuthContext';
import type { PaginatedGroups } from '@embr/types';

const GROUP_CATEGORIES = [
  'All', 'Arts & Culture', 'Music', 'Technology', 'Environment', 'Social Justice',
  'Health & Wellness', 'Education', 'Community Organizing', 'Business', 'Other',
];

export default function GroupsPage() {
  const { user } = useAuth();
  const { getGroups, joinGroup, loading } = useGroups();
  const [result, setResult] = useState<PaginatedGroups>({ items: [], hasMore: false, nextCursor: null });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [joinLoadingId, setJoinLoadingId] = useState<string | null>(null);
  const [joinStateByGroupId, setJoinStateByGroupId] = useState<Record<string, 'idle' | 'requested'>>({});
  const [joinFeedback, setJoinFeedback] = useState('');

  const load = async (reset = true) => {
    const params: any = {};
    if (query) params.q = query;
    if (category !== 'All') params.category = category;
    if (!reset && result.nextCursor) params.cursor = result.nextCursor;

    const data = await getGroups(params);
    setResult(reset ? data : { ...data, items: [...result.items, ...data.items] });
  };

  useEffect(() => { load(true); }, [query, category]);

  const handleJoin = async (groupId: string) => {
    setJoinLoadingId(groupId);
    try {
      const result = await joinGroup(groupId);
      if (result?.status === 'pending') {
        setJoinStateByGroupId((prev) => ({ ...prev, [groupId]: 'requested' }));
        setJoinFeedback('Join request sent. You will be notified when approved.');
      } else if (result?.status === 'joined') {
        setJoinFeedback('You joined the group.');
      }
      await load(true);
    } catch {
      setJoinFeedback('Could not complete join action. Please retry.');
    }
    setJoinLoadingId(null);
  };

  return (
    <ProtectedPageShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem' }}>Groups</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--embr-muted-text)', fontSize: '0.95rem' }}>
            Find your community. Build power together.
          </p>
        </div>
        <Link href="/groups/create">
          <button style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700' }}>
            + Create Group
          </button>
        </Link>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search groups..."
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--embr-radius-md)',
            border: '1px solid var(--embr-border)',
            background: 'var(--embr-bg)',
            fontSize: '0.9rem',
            color: 'var(--embr-text)',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        {GROUP_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '0.375rem 0.875rem',
              borderRadius: '999px',
              border: '1px solid var(--embr-border)',
              background: category === cat ? 'var(--embr-accent)' : 'transparent',
              color: category === cat ? '#fff' : 'var(--embr-text)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>
      {joinFeedback && (
        <div style={{ marginBottom: '1rem', fontSize: '0.88rem', color: 'var(--embr-muted-text)' }}>
          {joinFeedback}
        </div>
      )}

      {/* Grid */}
      {loading && result.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--embr-muted-text)' }}>Loading groups...</div>
      ) : result.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--embr-muted-text)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤝</div>
          <p style={{ margin: 0, fontWeight: '600' }}>No groups found</p>
          <p style={{ margin: '0.5rem 0 1rem', fontSize: '0.875rem' }}>Be the first to create one!</p>
          <Link href="/groups/create">
            <button style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Create a Group</button>
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {result.items.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onJoin={handleJoin}
                joinLoading={joinLoadingId === group.id}
                currentUserId={user?.id}
                joinState={joinStateByGroupId[group.id] || 'idle'}
              />
            ))}
          </div>

          {result.hasMore && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button
                onClick={() => load(false)}
                disabled={loading}
                style={{ padding: '0.625rem 2rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </ProtectedPageShell>
  );
}
