import React, { useEffect, useMemo, useState } from 'react';
import type { CreateEventInput, EventType, PricingType } from '@embr/types';
import { clearDraft, readDraft, writeDraft } from '@/lib/draft';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

interface EventFormProps {
  defaultGroupId?: string;
  defaultLinkedMutualAidId?: string;
  onSubmit: (input: CreateEventInput) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function EventForm({ defaultGroupId, defaultLinkedMutualAidId, onSubmit, loading, error }: EventFormProps) {
  const draftKey = useMemo(
    () => `draft_event_form_v1_${defaultGroupId || 'none'}_${defaultLinkedMutualAidId || 'none'}`,
    [defaultGroupId, defaultLinkedMutualAidId],
  );
  const [form, setForm] = useState<CreateEventInput>({
    title: '',
    description: '',
    eventType: 'IN_PERSON',
    startAt: '',
    endAt: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: '',
    virtualLink: '',
    coverUrl: '',
    isTicketed: false,
    pricingType: 'FREE',
    minPrice: undefined,
    suggestedPrice: undefined,
    tags: [],
    groupId: defaultGroupId,
    linkedMutualAidId: defaultLinkedMutualAidId,
  });
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'error' | 'restored'>('idle');

  useEffect(() => {
    const savedDraft = readDraft<CreateEventInput>(draftKey);
    if (!savedDraft) return;
    setForm((prev) => ({ ...prev, ...savedDraft }));
    setDraftStatus('restored');
  }, [draftKey]);

  const set = (key: keyof CreateEventInput, value: any) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    const hasDraftData = Boolean(form.title || form.description || form.location || form.virtualLink);
    if (!hasDraftData) return;
    const didSave = writeDraft(draftKey, form);
    setDraftStatus(didSave ? 'saved' : 'error');
  }, [draftKey, form]);

  useUnsavedChangesGuard({
    enabled: Boolean(form.title || form.description || form.location || form.virtualLink),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
    clearDraft(draftKey);
    setDraftStatus('idle');
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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: '600',
    fontSize: '0.85rem',
    marginBottom: '0.35rem',
    color: 'var(--embr-text)',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--embr-radius-md)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.875rem', fontWeight: '600' }}>
          {error}
        </div>
      )}
      {draftStatus !== 'idle' && (
        <div style={{ fontSize: '0.82rem', color: draftStatus === 'error' ? '#ef4444' : 'var(--embr-muted-text)' }}>
          {draftStatus === 'restored' && 'Draft restored from your last session.'}
          {draftStatus === 'saved' && 'Draft saved locally.'}
          {draftStatus === 'error' && 'Could not save local draft.'}
        </div>
      )}

      <div>
        <label style={labelStyle}>Title *</label>
        <input style={inputStyle} value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="What's happening?" />
      </div>

      <div>
        <label style={labelStyle}>Description *</label>
        <textarea
          style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          required
          placeholder="Tell people what to expect..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Event Type *</label>
          <select style={inputStyle} value={form.eventType} onChange={(e) => set('eventType', e.target.value as EventType)}>
            <option value="IN_PERSON">📍 In Person</option>
            <option value="VIRTUAL">💻 Virtual</option>
            <option value="HYBRID">🌐 Hybrid</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Cover Image URL</label>
          <input style={inputStyle} value={form.coverUrl ?? ''} onChange={(e) => set('coverUrl', e.target.value)} placeholder="https://..." />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Start *</label>
          <input style={inputStyle} type="datetime-local" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} required />
        </div>
        <div>
          <label style={labelStyle}>End *</label>
          <input style={inputStyle} type="datetime-local" value={form.endAt} onChange={(e) => set('endAt', e.target.value)} required />
        </div>
      </div>

      {(form.eventType === 'IN_PERSON' || form.eventType === 'HYBRID') && (
        <div>
          <label style={labelStyle}>Location</label>
          <input style={inputStyle} value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="123 Main St, City, State" />
        </div>
      )}

      {(form.eventType === 'VIRTUAL' || form.eventType === 'HYBRID') && (
        <div>
          <label style={labelStyle}>Virtual Link</label>
          <input style={inputStyle} value={form.virtualLink ?? ''} onChange={(e) => set('virtualLink', e.target.value)} placeholder="https://meet.google.com/..." />
        </div>
      )}

      <div>
        <label style={labelStyle}>Max Attendees (optional)</label>
        <input style={inputStyle} type="number" min="1" value={form.maxAttendees ?? ''} onChange={(e) => set('maxAttendees', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Leave blank for unlimited" />
      </div>

      {/* Ticketing */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={form.isTicketed} onChange={(e) => set('isTicketed', e.target.checked)} />
          This event has a ticket / admission fee
        </label>
      </div>

      {form.isTicketed && (
        <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-surface)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Pricing Type</label>
            <select style={inputStyle} value={form.pricingType} onChange={(e) => set('pricingType', e.target.value as PricingType)}>
              <option value="FREE">Free</option>
              <option value="FIXED">Fixed Price</option>
              <option value="SLIDING_SCALE">Sliding Scale</option>
              <option value="PAY_WHAT_YOU_CAN">Pay What You Can</option>
            </select>
          </div>
          {form.pricingType !== 'FREE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Minimum Price ($)</label>
                <input style={inputStyle} type="number" min="0" step="0.01" value={form.minPrice !== undefined ? (form.minPrice / 100).toFixed(2) : ''} onChange={(e) => set('minPrice', e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined)} placeholder="0.00" />
              </div>
              <div>
                <label style={labelStyle}>Suggested Price ($)</label>
                <input style={inputStyle} type="number" min="0" step="0.01" value={form.suggestedPrice !== undefined ? (form.suggestedPrice / 100).toFixed(2) : ''} onChange={(e) => set('suggestedPrice', e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined)} placeholder="0.00" />
              </div>
            </div>
          )}
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--embr-muted-text)' }}>
            Embr takes 2%. You keep 98% of ticket revenue.
          </p>
        </div>
      )}

      <div>
        <label style={labelStyle}>Tags (comma-separated)</label>
        <input
          style={inputStyle}
          value={(form.tags ?? []).join(', ')}
          onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
          placeholder="music, community, workshop"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{ padding: '0.75rem 2rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem', alignSelf: 'flex-start' }}
      >
        {loading ? 'Saving...' : 'Save Event'}
      </button>
    </form>
  );
}
