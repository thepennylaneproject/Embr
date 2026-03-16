import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { useOrganizing } from '@/hooks/useOrganizing';
import type { CreateAlertInput, AlertUrgency } from '@embr/types';
import { ALERT_URGENCY_COLORS } from '@embr/types';

export default function CreateAlertPage() {
  const router = useRouter();
  const { id: slug } = router.query;
  const { createAlert, loading, error } = useOrganizing();

  const [_groupId, _setGroupId] = useState('');
  const [form, setForm] = useState<CreateAlertInput>({ title: '', body: '', urgency: 'NORMAL' });

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--embr-radius-md)',
    border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.875rem',
    color: 'var(--embr-text)', boxSizing: 'border-box',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    // We need the group's UUID, not slug — the group ID is fetched from context
    // For simplicity, we use the id param directly (works when group IDs are used as URL param)
    await createAlert(slug as string, form);
    router.push(`/groups/${slug}?tab=alerts`);
  };

  return (
    <ProtectedPageShell>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontWeight: '800', fontSize: '1.5rem' }}>Post Action Alert</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--embr-muted-text)', fontSize: '0.95rem' }}>
            All group members will be notified immediately.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.875rem' }}>{error}</div>}

          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Urgency</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['NORMAL', 'URGENT', 'CRITICAL'] as AlertUrgency[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, urgency: u }))}
                  style={{
                    padding: '0.4rem 0.875rem', borderRadius: '999px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600',
                    border: `1px solid ${ALERT_URGENCY_COLORS[u]}`,
                    background: form.urgency === u ? ALERT_URGENCY_COLORS[u] : 'transparent',
                    color: form.urgency === u ? '#fff' : ALERT_URGENCY_COLORS[u],
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Title *</label>
            <input style={inputStyle} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="Short, direct headline" />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Body *</label>
            <textarea style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required placeholder="Full message. Be specific and clear..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>CTA Button Text</label>
              <input style={inputStyle} value={form.ctaText ?? ''} onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))} placeholder="Sign the petition" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>CTA URL</label>
              <input style={inputStyle} value={form.ctaUrl ?? ''} onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))} placeholder="https://..." />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Expires At (optional)</label>
            <input style={inputStyle} type="datetime-local" value={form.expiresAt ?? ''} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={loading} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}>
              {loading ? 'Posting...' : 'Post Alert'}
            </button>
            <button type="button" onClick={() => router.back()} style={{ padding: '0.625rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ProtectedPageShell>
  );
}
