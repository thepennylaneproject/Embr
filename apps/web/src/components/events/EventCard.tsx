import React from 'react';
import Link from 'next/link';
import type { Event } from '@embr/types';
import { EVENT_TYPE_ICONS, PRICING_TYPE_LABELS } from '@embr/types';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const start = new Date(event.startAt);
  const dateLabel = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeLabel = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const pricingLabel =
    event.pricingType === 'FREE'
      ? 'Free'
      : event.pricingType === 'SLIDING_SCALE' || event.pricingType === 'PAY_WHAT_YOU_CAN'
      ? event.minPrice
        ? `$${(event.minPrice / 100).toFixed(0)}+`
        : PRICING_TYPE_LABELS[event.pricingType]
      : event.suggestedPrice
      ? `$${(event.suggestedPrice / 100).toFixed(0)}`
      : PRICING_TYPE_LABELS[event.pricingType];

  return (
    <Link href={`/events/${event.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={{
          border: '1px solid var(--embr-border)',
          borderRadius: 'var(--embr-radius-lg)',
          overflow: 'hidden',
          background: 'var(--embr-surface)',
          cursor: 'pointer',
          transition: 'box-shadow 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
      >
        {event.coverUrl && (
          <img
            src={event.coverUrl}
            alt={event.title}
            style={{ width: '100%', height: '140px', objectFit: 'cover' }}
          />
        )}
        <div style={{ padding: '1rem' }}>
          {/* Date strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--embr-accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {dateLabel} · {timeLabel}
            </span>
          </div>

          <h3 style={{ margin: '0 0 0.25rem', fontWeight: '700', fontSize: '0.95rem', lineHeight: 1.3 }}>
            {event.title}
          </h3>

          {/* Location / virtual */}
          {(event.location || event.eventType === 'VIRTUAL') && (
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: 'var(--embr-muted-text)' }}>
              {EVENT_TYPE_ICONS[event.eventType]}{' '}
              {event.eventType === 'VIRTUAL' ? 'Online' : event.location}
            </p>
          )}

          {/* Footer row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.375rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                background: event.pricingType === 'FREE' ? 'rgba(16,185,129,0.1)' : 'rgba(var(--embr-accent-rgb, 255,90,31),0.1)',
                color: event.pricingType === 'FREE' ? '#059669' : 'var(--embr-accent)',
              }}
            >
              {pricingLabel}
            </span>

            {event._count && (
              <span style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>
                {event._count.attendees} going
              </span>
            )}
          </div>

          {event.group && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>
              📌 {event.group.name}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
