import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { EventCard } from '@/components/events/EventCard';
import { FeatureHint } from '@/components/onboarding';
import { useEvents } from '@/hooks/useEvents';
import type { EventType, PaginatedEvents } from '@embr/types';

const TYPES: { val: EventType | ''; label: string }[] = [
  { val: '', label: 'All Types' },
  { val: 'IN_PERSON', label: '📍 In Person' },
  { val: 'VIRTUAL', label: '💻 Virtual' },
  { val: 'HYBRID', label: '🌐 Hybrid' },
];

export default function EventsPage() {
  const router = useRouter();
  const { groupId } = router.query;
  const { getEvents, loading } = useEvents();

  const [result, setResult] = useState<PaginatedEvents>({ items: [], hasMore: false, nextCursor: null });
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | ''>('');
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const load = async (reset = true) => {
    const params: any = { upcoming: tab === 'upcoming' };
    if (query) params.q = query;
    if (typeFilter) params.eventType = typeFilter;
    if (groupId) params.groupId = groupId;
    if (!reset && result.nextCursor) params.cursor = result.nextCursor;

    const data = await getEvents(params);
    setResult(reset ? data : { ...data, items: [...result.items, ...data.items] });
  };

  useEffect(() => { load(true); }, [query, typeFilter, tab, groupId]);

  return (
    <ProtectedPageShell>
      <FeatureHint
        pageId="events"
        icon="🗓"
        title="Welcome to Events"
        description="Discover and RSVP to skill shares, meetups, and teach-ins. Host your own in-person or virtual event and invite the community."
      />
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem' }}>Events</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--embr-muted-text)', fontSize: '0.95rem' }}>
            Skill shares, meetups, teach-ins, and more.
          </p>
        </div>
        <Link href={`/events/create${groupId ? `?groupId=${groupId}` : ''}`}>
          <button style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700' }}>
            + Host Event
          </button>
        </Link>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              border: '1px solid var(--embr-border)',
              background: tab === t ? 'var(--embr-accent)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--embr-text)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: '600',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events..."
          style={{ flex: '1', minWidth: '200px', padding: '0.5rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.875rem', color: 'var(--embr-text)' }}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.875rem' }}>
          {TYPES.map(({ val, label }) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading && result.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--embr-muted-text)' }}>Loading...</div>
      ) : result.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--embr-muted-text)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</div>
          <p style={{ margin: 0, fontWeight: '600' }}>No {tab} events yet</p>
          <p style={{ margin: '0.5rem 0 1rem', fontSize: '0.875rem' }}>Be the first to host one!</p>
          <Link href="/events/create">
            <button style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Host an Event</button>
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {result.items.map((event) => <EventCard key={event.id} event={event} />)}
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
