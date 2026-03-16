import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import type { CreateListingInput, ListingType } from '@embr/types';
import { LISTING_CATEGORIES, LISTING_CONDITION_LABELS } from '@embr/types';
import { clearDraft, readDraft, writeDraft } from '@/lib/draft';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

interface CreateListingFormProps {
  onSubmit: (input: CreateListingInput) => Promise<any>;
  onPublish?: (id: string) => Promise<any>;
  loading?: boolean;
  defaultGroupId?: string;
}

export const CreateListingForm: React.FC<CreateListingFormProps> = ({ onSubmit, onPublish, loading, defaultGroupId }) => {
  const router = useRouter();
  const draftKey = useMemo(() => `draft_listing_form_v1_${defaultGroupId || 'none'}`, [defaultGroupId]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateListingInput>({
    title: '',
    description: '',
    price: 0,
    type: 'PHYSICAL',
    category: '',
    images: [],
    quantity: 1,
    allowOffers: false,
    isShippable: false,
    groupId: defaultGroupId,
  });
  const [priceInput, setPriceInput] = useState('');
  const [error, setError] = useState('');
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'error' | 'restored'>('idle');

  useEffect(() => {
    const draft = readDraft<{ step: number; form: CreateListingInput; priceInput: string }>(draftKey);
    if (!draft) return;
    setStep(draft.step || 1);
    if (draft.form) setForm((prev) => ({ ...prev, ...draft.form }));
    if (typeof draft.priceInput === 'string') setPriceInput(draft.priceInput);
    setDraftStatus('restored');
  }, [draftKey]);

  useEffect(() => {
    const hasDraftData = Boolean(form.title || form.description || form.category || form.price || form.images?.length);
    if (!hasDraftData) return;
    const didSave = writeDraft(draftKey, { step, form, priceInput });
    setDraftStatus(didSave ? 'saved' : 'error');
  }, [draftKey, step, form, priceInput]);

  useUnsavedChangesGuard({
    enabled: Boolean(form.title || form.description || form.category || form.price || form.images?.length),
  });

  const set = (key: keyof CreateListingInput, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', color: 'var(--embr-text)', fontSize: '0.9rem', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.375rem' };

  const handleSubmit = async (publish = false) => {
    setError('');
    try {
      const listing = await onSubmit(form);
      if (publish && onPublish) await onPublish(listing.id);
      clearDraft(draftKey);
      setDraftStatus('idle');
      router.push(`/marketplace/${listing.id}`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {['Type', 'Details', 'Pricing'].map((label, i) => (
          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '999px', background: step > i ? 'var(--embr-accent)' : 'var(--embr-border)', transition: 'background 0.2s' }} title={label} />
        ))}
      </div>
      {draftStatus !== 'idle' && (
        <div style={{ fontSize: '0.82rem', marginBottom: '1rem', color: draftStatus === 'error' ? '#ef4444' : 'var(--embr-muted-text)' }}>
          {draftStatus === 'restored' && 'Draft restored from your previous session.'}
          {draftStatus === 'saved' && 'Draft saved locally.'}
          {draftStatus === 'error' && 'Unable to save local draft.'}
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>What are you selling?</h2>

          <div>
            <label style={labelStyle}>Item Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {([
                { val: 'PHYSICAL', icon: '📦', label: 'Physical Item', desc: 'Ships or local pickup' },
                { val: 'DIGITAL', icon: '💾', label: 'Digital Item', desc: 'Download or online delivery' },
                { val: 'BUNDLE', icon: '🎁', label: 'Bundle', desc: 'Multiple items together' },
              ] as { val: ListingType; icon: string; label: string; desc: string }[]).map(({ val, icon, label, desc }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set('type', val)}
                  style={{
                    padding: '0.875rem 0.5rem',
                    borderRadius: 'var(--embr-radius-md)',
                    border: `2px solid ${form.type === val ? 'var(--embr-accent)' : 'var(--embr-border)'}`,
                    background: form.type === val ? 'var(--embr-accent)11' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{icon}</div>
                  <div style={{ fontWeight: '700', fontSize: '0.82rem' }}>{label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--embr-muted-text)', marginTop: '0.2rem' }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Category *</label>
            <select style={inputStyle} value={form.category} onChange={(e) => set('category', e.target.value)} required>
              <option value="">Select a category</option>
              {LISTING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button onClick={() => setStep(2)} disabled={!form.category} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-end', opacity: !form.category ? 0.6 : 1 }}>
            Next →
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Listing Details</h2>

          <div>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="What are you selling?" maxLength={150} required />
          </div>

          <div>
            <label style={labelStyle}>Description *</label>
            <textarea style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe your item in detail..." maxLength={5000} />
          </div>

          {form.type !== 'DIGITAL' && (
            <div>
              <label style={labelStyle}>Condition</label>
              <select style={inputStyle} value={form.condition || ''} onChange={(e) => set('condition', e.target.value || undefined)}>
                <option value="">Select condition</option>
                {Object.entries(LISTING_CONDITION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Image URLs (one per line, up to 10)</label>
            <textarea
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={(form.images || []).join('\n')}
              onChange={(e) => set('images', e.target.value.split('\n').filter(Boolean))}
              placeholder="https://example.com/image.jpg"
            />
            <div style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)', marginTop: '0.25rem' }}>
              Paste image URLs — upload via Media Uploader coming soon
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
            <button onClick={() => setStep(3)} disabled={!form.title || !form.description} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', fontWeight: '700', cursor: 'pointer', opacity: (!form.title || !form.description) ? 0.6 : 1 }}>Next →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Pricing & Options</h2>

          <div>
            <label style={labelStyle}>Price (USD) *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--embr-muted-text)', fontWeight: '700' }}>$</span>
              <input
                style={{ ...inputStyle, paddingLeft: '1.5rem' }}
                type="number"
                min="0.01"
                step="0.01"
                value={priceInput}
                onChange={(e) => {
                  setPriceInput(e.target.value);
                  set('price', Math.round(parseFloat(e.target.value || '0') * 100));
                }}
                placeholder="0.00"
                required
              />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)', marginTop: '0.25rem' }}>
              You keep {((1 - 0.02) * 100).toFixed(0)}% — Embr charges 2%
            </div>
          </div>

          <div>
            <label style={labelStyle}>Quantity *</label>
            <input type="number" style={inputStyle} min="1" value={form.quantity} onChange={(e) => set('quantity', parseInt(e.target.value) || 1)} />
          </div>

          {form.type === 'PHYSICAL' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <input type="checkbox" id="isShippable" checked={form.isShippable} onChange={(e) => set('isShippable', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="isShippable" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Shipping available</label>
              </div>
              {form.isShippable && (
                <div>
                  <label style={labelStyle}>Shipping Cost (USD)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--embr-muted-text)', fontWeight: '700' }}>$</span>
                    <input style={{ ...inputStyle, paddingLeft: '1.5rem' }} type="number" min="0" step="0.01" value={form.shippingCost ? form.shippingCost / 100 : ''} onChange={(e) => set('shippingCost', Math.round(parseFloat(e.target.value || '0') * 100))} placeholder="0.00" />
                  </div>
                </div>
              )}
              <div>
                <label style={labelStyle}>Location (for local pickup)</label>
                <input style={inputStyle} value={form.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Brooklyn, NY" />
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <input type="checkbox" id="allowOffers" checked={form.allowOffers} onChange={(e) => set('allowOffers', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            <label htmlFor="allowOffers" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Accept offers from buyers</label>
          </div>

          {error && <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', background: '#fef2f2', color: '#dc2626', fontSize: '0.875rem' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => setStep(2)} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleSubmit(false)} disabled={loading || !form.price} style={{ padding: '0.625rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600', opacity: (!form.price || loading) ? 0.6 : 1 }}>
                Save Draft
              </button>
              <button onClick={() => handleSubmit(true)} disabled={loading || !form.price} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', fontWeight: '700', cursor: 'pointer', opacity: (!form.price || loading) ? 0.6 : 1 }}>
                {loading ? 'Publishing...' : 'Publish Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
