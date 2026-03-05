import React, { useState } from 'react';

interface ResponseModalProps {
  postTitle: string;
  onSubmit: (message: string) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

export const ResponseModal: React.FC<ResponseModalProps> = ({ postTitle, onSubmit, onClose, loading }) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) { setError('Please write a message'); return; }
    setError('');
    try {
      await onSubmit(message.trim());
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send response');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: 'var(--embr-surface)', borderRadius: 'var(--embr-radius-lg)', padding: '1.5rem', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: '700' }}>Respond to Request</h2>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--embr-muted-text)', lineHeight: 1.5 }}>
          <em>"{postTitle}"</em>
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.375rem' }}>
            Your message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe how you can help, when you're available, any relevant details..."
            rows={4}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem',
              borderRadius: 'var(--embr-radius-md)',
              border: '1px solid var(--embr-border)',
              background: 'var(--embr-bg)',
              color: 'var(--embr-text)',
              fontSize: '0.9rem',
              resize: 'vertical',
              boxSizing: 'border-box',
              marginBottom: '0.875rem',
            }}
          />

          {error && <div style={{ padding: '0.625rem', borderRadius: 'var(--embr-radius-md)', background: '#fef2f2', color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.875rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !message.trim()}
              style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Sending...' : 'Send Response'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
