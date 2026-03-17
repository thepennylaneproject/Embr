import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { RSVPButton } from '@/components/events/RSVPButton';
import { AttendeeList } from '@/components/events/AttendeeList';
import { EventRecapForm } from '@/components/events/EventRecapForm';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import type { Event, EventAttendee, RsvpStatus } from '@embr/types';
import { EVENT_TYPE_ICONS, EVENT_TYPE_LABELS, PRICING_TYPE_LABELS } from '@embr/types';

export default function EventDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { getEvent, getAttendees, rsvp, cancelRsvp, createRecap, cancelEvent, loading, error } = useEvents();

  const [event, setEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showRecapForm, setShowRecapForm] = useState(false);

  const load = async () => {
    if (!id) return;
    const e = await getEvent(id as string);
    setEvent(e);
    const a = await getAttendees(id as string);
    setAttendees(a.items);
  };

  useEffect(() => { load(); }, [id]);

  const handleRsvp = async (status: RsvpStatus, amount?: number) => {
    if (!event) return;
    setRsvpLoading(true);
    try {
      await rsvp(event.id, { status, amountPaid: amount });
      await load();
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleCancelRsvp = async () => {
    if (!event) return;
    setRsvpLoading(true);
    try {
      await cancelRsvp(event.id);
      await load();
    } finally {
      setRsvpLoading(false);
    }
  };

  if (loading && !event) {
    return <ProtectedPageShell><div style={{ textAlign: 'center', padding: '3rem', color: 'var(--embr-muted-text)' }}>Loading...</div></ProtectedPageShell>;
  }

  if (!event) {
    return <ProtectedPageShell><div style={{ textAlign: 'center', padding: '3rem', color: 'var(--embr-muted-text)' }}>Event not found.</div></ProtectedPageShell>;
  }

  const isHost = user?.id === event.hostId;
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const isPast = end < new Date();

  const statusBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '0.2rem 0.7rem',
    borderRadius: '999px',
    fontWeight: '700',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: event.status === 'PUBLISHED' ? 'rgba(16,185,129,0.1)' : event.status === 'CANCELLED' ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)',
    color: event.status === 'PUBLISHED' ? '#059669' : event.status === 'CANCELLED' ? '#ef4444' : 'var(--embr-muted-text)',
  };

  return (
    <ProtectedPageShell>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Cover */}
        {event.coverUrl && (
          <img src={event.coverUrl} alt={event.title} style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: 'var(--embr-radius-lg)', marginBottom: '1.5rem' }} />
        )}

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={statusBadgeStyle}>{event.status}</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--embr-muted-text)', fontWeight: '600' }}>
              {EVENT_TYPE_ICONS[event.eventType]} {EVENT_TYPE_LABELS[event.eventType]}
            </span>
            {event.group && (
              <Link href={`/groups/${event.group.slug}`} style={{ fontSize: '0.82rem', color: 'var(--embr-accent)', fontWeight: '600', textDecoration: 'none' }}>
                📌 {event.group.name}
              </Link>
            )}
          </div>

          <h1 style={{ margin: '0 0 0.5rem', fontWeight: '800', fontSize: '1.75rem', lineHeight: 1.2 }}>{event.title}</h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', color: 'var(--embr-text)', marginBottom: '1rem' }}>
            <span>📅 {start.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>🕐 {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} — {end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} ({event.timezone})</span>
            {event.location && <span>📍 {event.location}</span>}
            {event.virtualLink && <span>💻 <a href={event.virtualLink} target="_blank" rel="noreferrer" style={{ color: 'var(--embr-accent)' }}>Join Online</a></span>}
          </div>

          {/* Pricing */}
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: event.pricingType === 'FREE' ? '#059669' : 'var(--embr-accent)' }}>
              🎟 {event.pricingType === 'FREE' ? 'Free' : event.minPrice ? `$${(event.minPrice / 100).toFixed(0)}+ — ${PRICING_TYPE_LABELS[event.pricingType]}` : PRICING_TYPE_LABELS[event.pricingType]}
            </span>
          </div>

          {/* RSVP */}
          {!isPast && event.status === 'PUBLISHED' && user && !isHost && (
            <RSVPButton
              event={event}
              myRsvp={event.myRsvp}
              onRsvp={handleRsvp}
              onCancelRsvp={handleCancelRsvp}
              loading={rsvpLoading}
            />
          )}

          {/* Host actions */}
          {isHost && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <Link href={`/events/create?edit=${event.id}`}>
                <button style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>Edit</button>
              </Link>
              {isPast && !event.recap && (
                <button onClick={() => setShowRecapForm(true)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700' }}>
                  Post Recap
                </button>
              )}
              {event.status === 'PUBLISHED' && (
                <button onClick={() => cancelEvent(event.id).then(load)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
                  Cancel Event
                </button>
              )}
            </div>
          )}
        </div>

        {/* Linked Mutual Aid */}
        {event.linkedMutualAid && (
          <div style={{ padding: '0.875rem 1rem', borderRadius: 'var(--embr-radius-md)', background: 'var(--embr-surface)', border: '1px solid var(--embr-border)', marginBottom: '1.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--embr-muted-text)', fontWeight: '600' }}>🤝 Related Mutual Aid Request</p>
            <Link href={`/mutual-aid/${event.linkedMutualAid.id}`} style={{ fontWeight: '700', color: 'var(--embr-accent)', textDecoration: 'none', fontSize: '0.9rem' }}>
              {event.linkedMutualAid.title}
            </Link>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--embr-border)', margin: '1.5rem 0' }} />

        {/* Description */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontWeight: '700', fontSize: '1.1rem', margin: '0 0 0.75rem' }}>About this event</h2>
          <p style={{ margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--embr-text)' }}>{event.description}</p>
        </div>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {event.tags.map((tag) => (
              <span key={tag} style={{ padding: '0.25rem 0.625rem', borderRadius: '999px', border: '1px solid var(--embr-border)', fontSize: '0.78rem', color: 'var(--embr-muted-text)' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Attendees */}
        {attendees.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <AttendeeList attendees={attendees} totalCount={event._count?.attendees} />
          </div>
        )}

        {/* Hosted by */}
        <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-lg)', border: '1px solid var(--embr-border)', background: 'var(--embr-surface)', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--embr-muted-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hosted by</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--embr-border)', overflow: 'hidden', flexShrink: 0 }}>
              {event.host?.profile?.avatarUrl ? (
                <img src={event.host.profile.avatarUrl} alt={event.host?.profile?.displayName || event.host?.username || 'Event host'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--embr-muted-text)' }}>
                  {(event.host?.profile?.displayName || event.host?.username || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>{event.host?.profile?.displayName || event.host?.username}</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--embr-muted-text)' }}>@{event.host?.username}</p>
            </div>
          </div>
        </div>

        {/* Recap */}
        {event.recap && (
          <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-lg)', border: '1px solid var(--embr-border)', background: 'var(--embr-surface)', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontWeight: '700', fontSize: '1rem' }}>Event Recap</h3>
            {event.recap.notes && <p style={{ margin: '0 0 0.75rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{event.recap.notes}</p>}
            {event.recap.mediaUrls.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
                {event.recap.mediaUrls.map((url, i) => (
                  <img key={i} src={url} alt={`Recap photo ${i + 1}`} style={{ width: '100%', borderRadius: 'var(--embr-radius-md)', objectFit: 'cover', aspectRatio: '4/3' }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recap form */}
        {showRecapForm && isHost && (
          <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-lg)', border: '1px solid var(--embr-border)', background: 'var(--embr-surface)', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontWeight: '700' }}>Post a Recap</h3>
            <EventRecapForm
              onSubmit={async (input) => {
                await createRecap(event.id, input);
                setShowRecapForm(false);
                await load();
              }}
              loading={loading}
              error={error}
            />
          </div>
        )}
      </div>
    </ProtectedPageShell>
  );
}
