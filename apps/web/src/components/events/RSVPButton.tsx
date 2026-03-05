import React, { useState } from 'react';
import type { Event, EventAttendee, RsvpStatus } from '@embr/types';

interface RSVPButtonProps {
  event: Event;
  myRsvp: EventAttendee | null | undefined;
  onRsvp: (status: RsvpStatus, amount?: number) => Promise<void>;
  onCancelRsvp: () => Promise<void>;
  loading?: boolean;
}

export function RSVPButton({ event, myRsvp, onRsvp, onCancelRsvp, loading }: RSVPButtonProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [payAmount, setPayAmount] = useState(
    event.suggestedPrice ? (event.suggestedPrice / 100).toFixed(2) : '',
  );

  const needsPayment = event.isTicketed && event.pricingType !== 'FREE';
  const isGoing = myRsvp?.status === 'GOING';

  if (isGoing) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <span style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', background: 'rgba(16,185,129,0.1)', color: '#059669', fontWeight: '700', fontSize: '0.875rem' }}>
          ✓ Going
        </span>
        <button
          onClick={onCancelRsvp}
          disabled={loading}
          style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--embr-muted-text)' }}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (!showOptions) {
    return (
      <button
        onClick={() => (needsPayment ? setShowOptions(true) : onRsvp('GOING'))}
        disabled={loading}
        style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}
      >
        {loading ? 'Loading...' : event.pricingType === 'FREE' ? 'RSVP — Free' : `RSVP${event.suggestedPrice ? ` · $${(event.suggestedPrice / 100).toFixed(0)} suggested` : ''}`}
      </button>
    );
  }

  // Sliding scale / pay what you can
  const min = event.minPrice ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', border: '1px solid var(--embr-border)', borderRadius: 'var(--embr-radius-md)', background: 'var(--embr-surface)' }}>
      <label style={{ fontWeight: '600', fontSize: '0.875rem' }}>
        {event.pricingType === 'SLIDING_SCALE' ? 'Choose your amount' : 'Pay what you can'}
      </label>
      {event.minPrice && event.minPrice > 0 && (
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--embr-muted-text)' }}>
          Minimum: ${(event.minPrice / 100).toFixed(2)}
        </p>
      )}
      {event.suggestedPrice && (
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--embr-muted-text)' }}>
          Suggested: ${(event.suggestedPrice / 100).toFixed(2)}
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ fontWeight: '600', fontSize: '1rem' }}>$</span>
        <input
          type="number"
          value={payAmount}
          onChange={(e) => setPayAmount(e.target.value)}
          min={(min / 100).toFixed(2)}
          step="0.01"
          style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.875rem' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => {
            const cents = Math.round(parseFloat(payAmount || '0') * 100);
            onRsvp('GOING', cents);
            setShowOptions(false);
          }}
          disabled={loading || parseFloat(payAmount || '0') * 100 < min}
          style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}
        >
          {loading ? 'Processing...' : 'Confirm RSVP'}
        </button>
        <button
          onClick={() => setShowOptions(false)}
          style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
