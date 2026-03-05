import React, { useState } from 'react';
import type { CreatePollInput } from '@embr/types';

interface CreatePollFormProps {
  onSubmit: (input: CreatePollInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export function CreatePollForm({ onSubmit, onCancel, loading, error }: CreatePollFormProps) {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiSelect, setMultiSelect] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [endsAt, setEndsAt] = useState('');

  const setOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  };

  const addOption = () => setOptions([...options, '']);
  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) return;
    await onSubmit({
      question,
      description: description || undefined,
      options: validOptions,
      multiSelect,
      isAnonymous,
      endsAt: endsAt || undefined,
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
      {error && <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.875rem' }}>{error}</div>}

      <div>
        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Question *</label>
        <input style={inputStyle} value={question} onChange={(e) => setQuestion(e.target.value)} required placeholder="What do you want to ask the group?" />
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Description (optional)</label>
        <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="More context for this poll..." />
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Options *</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input style={{ ...inputStyle, flex: 1 }} value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
              {options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--embr-muted-text)', padding: '0 0.25rem' }}>✕</button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button type="button" onClick={addOption} style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--embr-border)', borderRadius: 'var(--embr-radius-md)', padding: '0.375rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--embr-muted-text)' }}>
              + Add option
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
          <input type="checkbox" checked={multiSelect} onChange={(e) => setMultiSelect(e.target.checked)} />
          Allow multiple selections
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
          <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
          Anonymous voting
        </label>
      </div>

      <div>
        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Closes at (optional)</label>
        <input style={inputStyle} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" disabled={loading} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}>
          {loading ? 'Creating...' : 'Create Poll'}
        </button>
        <button type="button" onClick={onCancel} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
