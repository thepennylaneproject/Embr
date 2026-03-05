import React, { useState } from 'react';
import type { Poll, PollOption } from '@embr/types';

interface PollCardProps {
  poll: Poll;
  groupId: string;
  onVote: (pollId: string, optionIds: string[]) => Promise<void>;
  onClose?: (pollId: string) => Promise<void>;
  canManage?: boolean;
  currentUserId?: string;
  loading?: boolean;
}

export function PollCard({ poll, groupId, onVote, onClose, canManage, currentUserId, loading }: PollCardProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [voted, setVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totalVotes = poll.options.reduce((sum, o) => sum + (o._count?.votes ?? o.voteCount), 0);
  const isClosed = poll.status === 'CLOSED' || (poll.endsAt ? new Date(poll.endsAt) < new Date() : false);
  const hasVoted = voted || poll.options.some((o) => (o.votes ?? []).length > 0);
  const showResults = isClosed || hasVoted;

  const toggle = (id: string) => {
    if (poll.multiSelect) {
      setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    } else {
      setSelected([id]);
    }
  };

  const handleVote = async () => {
    if (selected.length === 0) return;
    setSubmitting(true);
    try {
      await onVote(poll.id, selected);
      setVoted(true);
      setSelected([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ border: '1px solid var(--embr-border)', borderRadius: 'var(--embr-radius-lg)', padding: '1rem', background: 'var(--embr-surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          {isClosed && (
            <span style={{ fontSize: '0.72rem', fontWeight: '700', background: 'rgba(107,114,128,0.1)', color: 'var(--embr-muted-text)', padding: '0.15rem 0.5rem', borderRadius: '999px', marginRight: '0.5rem', textTransform: 'uppercase' }}>
              Closed
            </span>
          )}
          <span style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)' }}>
            by {poll.author?.profile?.displayName || poll.author?.username}
          </span>
        </div>
        {canManage && !isClosed && onClose && (
          <button onClick={() => onClose(poll.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--embr-muted-text)', textDecoration: 'underline' }}>
            Close poll
          </button>
        )}
      </div>

      <p style={{ margin: '0 0 0.875rem', fontWeight: '700', fontSize: '1rem', lineHeight: 1.3 }}>{poll.question}</p>
      {poll.description && <p style={{ margin: '-0.375rem 0 0.875rem', fontSize: '0.85rem', color: 'var(--embr-muted-text)', lineHeight: 1.5 }}>{poll.description}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {poll.options.map((opt) => {
          const votes = opt._count?.votes ?? opt.voteCount;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = selected.includes(opt.id);
          const myVote = (opt.votes ?? []).length > 0;

          return (
            <div key={opt.id}>
              {showResults ? (
                <div style={{ position: 'relative', padding: '0.5rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: `1px solid ${myVote ? 'var(--embr-accent)' : 'var(--embr-border)'}`, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: myVote ? 'rgba(var(--embr-accent-rgb,255,90,31),0.12)' : 'rgba(107,114,128,0.07)', width: `${pct}%`, transition: 'width 0.4s ease' }} />
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: myVote ? '700' : '500', fontSize: '0.875rem' }}>{opt.text}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--embr-muted-text)' }}>{pct}%</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => toggle(opt.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--embr-radius-md)',
                    border: `1px solid ${isSelected ? 'var(--embr-accent)' : 'var(--embr-border)'}`,
                    background: isSelected ? 'rgba(var(--embr-accent-rgb,255,90,31),0.08)' : 'transparent',
                    cursor: 'pointer',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '0.875rem',
                    color: 'var(--embr-text)',
                  }}
                >
                  {opt.text}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!showResults && (
        <button
          onClick={handleVote}
          disabled={selected.length === 0 || submitting || loading}
          style={{ marginTop: '0.875rem', padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}
        >
          {submitting ? 'Voting...' : 'Vote'}
        </button>
      )}

      <p style={{ margin: '0.625rem 0 0', fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        {poll.endsAt && !isClosed && ` · Closes ${new Date(poll.endsAt).toLocaleDateString()}`}
        {poll.isAnonymous && ' · Anonymous'}
        {poll.multiSelect && ' · Multi-select'}
      </p>
    </div>
  );
}
