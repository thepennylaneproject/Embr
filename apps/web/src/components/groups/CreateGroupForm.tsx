import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { CreateGroupInput, GroupType } from '@embr/types';
import { clearDraft, readDraft, writeDraft } from '@/lib/draft';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

interface CreateGroupFormProps {
  onSubmit: (input: CreateGroupInput) => Promise<any>;
  loading?: boolean;
}

const GROUP_CATEGORIES = [
  'Arts & Culture', 'Music', 'Technology', 'Environment', 'Social Justice',
  'Health & Wellness', 'Education', 'Community Organizing', 'Business',
  'Sports & Outdoors', 'Food & Cooking', 'Books & Writing', 'Film & Media', 'Other',
];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const CreateGroupForm: React.FC<CreateGroupFormProps> = ({ onSubmit, loading }) => {
  const router = useRouter();
  const draftKey = 'draft_group_form_v1';
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateGroupInput>({
    name: '',
    slug: '',
    description: '',
    type: 'PUBLIC',
    category: '',
    tags: [],
    rules: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [ruleInput, setRuleInput] = useState('');
  const [error, setError] = useState('');
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'error' | 'restored'>('idle');

  useEffect(() => {
    const draft = readDraft<{
      step: number;
      form: CreateGroupInput;
      tagInput: string;
      ruleInput: string;
    }>(draftKey);
    if (!draft) return;

    setStep(draft.step || 1);
    if (draft.form) setForm((prev) => ({ ...prev, ...draft.form }));
    if (typeof draft.tagInput === 'string') setTagInput(draft.tagInput);
    if (typeof draft.ruleInput === 'string') setRuleInput(draft.ruleInput);
    setDraftStatus('restored');
  }, []);

  useEffect(() => {
    const hasDraftData = Boolean(form.name || form.description || form.slug || form.tags?.length || form.rules?.length);
    if (!hasDraftData) return;
    const didSave = writeDraft(draftKey, { step, form, tagInput, ruleInput });
    setDraftStatus(didSave ? 'saved' : 'error');
  }, [step, form, tagInput, ruleInput]);

  useUnsavedChangesGuard({
    enabled: Boolean(form.name || form.description || form.slug || form.tags?.length || form.rules?.length),
  });

  const set = (key: keyof CreateGroupInput, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleNameChange = (name: string) => {
    set('name', name);
    if (!form.slug || form.slug === slugify(form.name)) {
      set('slug', slugify(name));
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags?.includes(t)) {
      set('tags', [...(form.tags || []), t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => set('tags', form.tags?.filter((t) => t !== tag));

  const addRule = () => {
    const r = ruleInput.trim();
    if (r) set('rules', [...(form.rules || []), r]);
    setRuleInput('');
  };

  const removeRule = (idx: number) => set('rules', form.rules?.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setError('');
    try {
      const group = await onSubmit(form);
      clearDraft(draftKey);
      setDraftStatus('idle');
      router.push(`/groups/${group.slug}`);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg[0] :
        msg || 'Could not create the group. Please try again.'
      );
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    borderRadius: 'var(--embr-radius-md)',
    border: '1px solid var(--embr-border)',
    background: 'var(--embr-bg)',
    color: 'var(--embr-text)',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--embr-text)',
    marginBottom: '0.375rem',
  };

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      {/* Steps indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {['Basics', 'Details', 'Rules & Visibility'].map((label, i) => (
          <div key={i} style={{
            flex: 1, height: '4px', borderRadius: '999px',
            background: step > i ? 'var(--embr-accent)' : 'var(--embr-border)',
            transition: 'background 0.2s',
          }} title={label} />
        ))}
      </div>
      {draftStatus !== 'idle' && (
        <div style={{ fontSize: '0.82rem', marginBottom: '1rem', color: draftStatus === 'error' ? '#ef4444' : 'var(--embr-muted-text)' }}>
          {draftStatus === 'restored' && 'Draft restored from your previous session.'}
          {draftStatus === 'saved' && 'Draft saved locally.'}
          {draftStatus === 'error' && 'Unable to save draft locally.'}
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Create a Group</h2>
          <div>
            <label style={labelStyle}>Group Name *</label>
            <input style={inputStyle} value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Chicago Mutual Aid Collective" />
          </div>
          <div>
            <label style={labelStyle}>Slug (URL) *</label>
            <input style={inputStyle} value={form.slug} onChange={(e) => set('slug', slugify(e.target.value))} placeholder="chicago-mutual-aid" />
            <div style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)', marginTop: '0.3rem' }}>
              embr.app/groups/{form.slug || 'your-slug'}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What is your group about? Who is it for?"
            />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={form.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">Select a category</option>
              {GROUP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button
            onClick={() => {
              const ensuredSlug = form.slug || slugify(form.name);
              if (!ensuredSlug) {
                setError('Please enter a valid group name.');
                return;
              }
              if (!form.slug) {
                set('slug', ensuredSlug);
              }
              setError('');
              setStep(2);
            }}
            disabled={!form.name}
            style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-end' }}
          >
            Next →
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Tags</h2>
          <div>
            <label style={labelStyle}>Tags (up to 10)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="e.g. mutual-aid, chicago"
              />
              <button onClick={addTag} style={{ padding: '0.625rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>Add</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.625rem' }}>
              {form.tags?.map((tag) => (
                <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'var(--embr-warm-1)', color: '#fff', fontSize: '0.8rem' }}>
                  {tag}
                  <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
            <button onClick={() => setStep(3)} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>Next →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Rules & Visibility</h2>

          <div>
            <label style={labelStyle}>Privacy</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(['PUBLIC', 'PRIVATE', 'SECRET'] as GroupType[]).map((t) => (
                <label key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', cursor: 'pointer', padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', border: `2px solid ${form.type === t ? 'var(--embr-accent)' : 'var(--embr-border)'}`, background: form.type === t ? 'var(--embr-accent)11' : 'transparent' }}>
                  <input type="radio" checked={form.type === t} onChange={() => set('type', t)} style={{ marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{t.charAt(0) + t.slice(1).toLowerCase()}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)' }}>
                      {t === 'PUBLIC' && 'Anyone can find and join'}
                      {t === 'PRIVATE' && 'Anyone can find, request to join'}
                      {t === 'SECRET' && 'Only members can see it'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Community Rules (optional)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={ruleInput}
                onChange={(e) => setRuleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRule()}
                placeholder="e.g. Be respectful to all members"
              />
              <button onClick={addRule} style={{ padding: '0.625rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>Add</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.625rem' }}>
              {form.rules?.map((rule, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--embr-radius-md)', background: 'var(--embr-bg)', border: '1px solid var(--embr-border)' }}>
                  <span style={{ color: 'var(--embr-muted-text)', fontWeight: '700', fontSize: '0.85rem', minWidth: '20px' }}>{i + 1}.</span>
                  <span style={{ flex: 1, fontSize: '0.875rem' }}>{rule}</span>
                  <button onClick={() => removeRule(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontSize: '0.85rem' }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', background: '#fef2f2', color: '#dc2626', fontSize: '0.875rem' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(2)} style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>← Back</button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
