import React, { useState } from 'react';
import type { CreateEventRecapInput } from '@embr/types';

interface EventRecapFormProps {
  onSubmit: (input: CreateEventRecapInput) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function EventRecapForm({ onSubmit, loading, error }: EventRecapFormProps) {
  const [notes, setNotes] = useState('');
  const [mediaUrls, setMediaUrls] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      notes: notes || undefined,
      mediaUrls: mediaUrls.split('\n').map((u) => u.trim()).filter(Boolean),
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--embr-radius-md)',
    border: '1px solid var(--embr-border)',
    background: 'var(--embr-bg)',
    fontSize: '0.875rem',
    color: 'var(--embr-text)',
    boxSizing: 'border-box',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
      <div>
        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Recap Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did it go? What happened? Any highlights..."
        />
      </div>
      <div>
        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Photo / Video URLs (one per line)</label>
        <textarea
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
          value={mediaUrls}
          onChange={(e) => setMediaUrls(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem', alignSelf: 'flex-start' }}
      >
        {loading ? 'Posting...' : 'Post Recap'}
      </button>
    </form>
  );
}
