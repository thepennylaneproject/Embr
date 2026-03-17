import React, { useState } from 'react';
import { useRouter } from 'next/router';
import type { CreateMutualAidPostInput, MutualAidType, MutualAidCategory, MutualAidUrgency } from '@embr/types';
import { MUTUAL_AID_CATEGORY_LABELS, MUTUAL_AID_CATEGORY_ICONS } from '@embr/types';

interface CreateMutualAidFormProps {
  onSubmit: (input: CreateMutualAidPostInput) => Promise<any>;
  loading?: boolean;
  defaultGroupId?: string;
}

const CATEGORIES = Object.entries(MUTUAL_AID_CATEGORY_LABELS) as [MutualAidCategory, string][];

export const CreateMutualAidForm: React.FC<CreateMutualAidFormProps> = ({ onSubmit, loading, defaultGroupId }) => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateMutualAidPostInput>({
    type: 'REQUEST',
    category: 'OTHER',
    title: '',
    description: '',
    urgency: 'MEDIUM',
    isRemote: false,
    groupId: defaultGroupId,
  });
  const [error, setError] = useState('');

  const set = (key: keyof CreateMutualAidPostInput, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', color: 'var(--embr-text)', fontSize: '0.9rem', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.375rem' };

  const handleSubmit = async () => {
    setError('');
    try {
      const post = await onSubmit(form);
      router.push(`/mutual-aid/${post.id}`);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg[0] :
        msg || 'Could not post your request. Please try again.'
      );
    }
  };

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {['Type', 'Details', 'Context'].map((label, i) => (
          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '999px', background: step > i ? 'var(--embr-accent)' : 'var(--embr-border)', transition: 'background 0.2s' }} title={label} />
        ))}
      </div>

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>What are you posting?</h2>

          {/* Type */}
          <div>
            <label style={labelStyle}>Post Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {(['REQUEST', 'OFFER'] as MutualAidType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--embr-radius-md)',
                    border: `2px solid ${form.type === t ? 'var(--embr-accent)' : 'var(--embr-border)'}`,
                    background: form.type === t ? 'var(--embr-accent)11' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{t === 'REQUEST' ? '🙏' : '🤝'}</div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{t === 'REQUEST' ? 'I need help' : 'I can help'}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)', marginTop: '0.2rem' }}>
                    {t === 'REQUEST' ? 'Request support from the community' : 'Offer your resources or skills'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
              {CATEGORIES.map(([cat, label]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set('category', cat)}
                  style={{
                    padding: '0.5rem 0.625rem',
                    borderRadius: 'var(--embr-radius-md)',
                    border: `2px solid ${form.category === cat ? 'var(--embr-accent)' : 'var(--embr-border)'}`,
                    background: form.category === cat ? 'var(--embr-accent)11' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    display: 'flex',
                    gap: '0.375rem',
                    alignItems: 'center',
                  }}
                >
                  <span>{MUTUAL_AID_CATEGORY_ICONS[cat]}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setStep(2)} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-end' }}>
            Next →
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Tell us more</h2>

          <div>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Need rides to doctor's appointments" maxLength={150} />
          </div>

          <div>
            <label style={labelStyle}>Description *</label>
            <textarea
              style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe in detail what you need or are offering..."
              maxLength={3000}
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)', textAlign: 'right', marginTop: '0.2rem' }}>
              {form.description.length}/3000
            </div>
          </div>

          <div>
            <label style={labelStyle}>Quantity / Amount (optional)</label>
            <input style={inputStyle} value={form.quantity || ''} onChange={(e) => set('quantity', e.target.value)} placeholder="e.g. 2 rides/week, 3 meals, 1 hour" maxLength={200} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
            <button onClick={() => setStep(3)} disabled={!form.title || !form.description} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', fontWeight: '700', cursor: 'pointer', opacity: (!form.title || !form.description) ? 0.6 : 1 }}>Next →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Context & Urgency</h2>

          <div>
            <label style={labelStyle}>Urgency</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {([
                { val: 'LOW', color: '#6b7280', label: 'Low' },
                { val: 'MEDIUM', color: '#d97706', label: 'Medium' },
                { val: 'HIGH', color: '#ea580c', label: 'High' },
                { val: 'CRITICAL', color: '#dc2626', label: '🚨 Critical' },
              ] as { val: MutualAidUrgency; color: string; label: string }[]).map(({ val, color, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set('urgency', val)}
                  style={{
                    padding: '0.5rem 0.25rem',
                    borderRadius: 'var(--embr-radius-md)',
                    border: `2px solid ${form.urgency === val ? color : 'var(--embr-border)'}`,
                    background: form.urgency === val ? `${color}22` : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    color: form.urgency === val ? color : 'var(--embr-muted-text)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Location (neighborhood or city)</label>
            <input style={inputStyle} value={form.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Logan Square, Chicago" maxLength={200} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <input type="checkbox" id="isRemote" checked={form.isRemote} onChange={(e) => set('isRemote', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            <label htmlFor="isRemote" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>This can be done remotely / online</label>
          </div>

          <div>
            <label style={labelStyle}>Expires (leave blank for no expiry)</label>
            <input type="date" style={inputStyle} value={form.expiresAt ? form.expiresAt.split('T')[0] : ''} onChange={(e) => set('expiresAt', e.target.value)} min={new Date().toISOString().split('T')[0]} />
          </div>

          {error && <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', background: '#fef2f2', color: '#dc2626', fontSize: '0.875rem' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(2)} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
