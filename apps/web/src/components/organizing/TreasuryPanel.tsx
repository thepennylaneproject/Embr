import React, { useState } from 'react';
import type { GroupTreasury, GroupTreasuryTransaction } from '@embr/types';
import { TREASURY_TRANSACTION_LABELS } from '@embr/types';

interface TreasuryPanelProps {
  treasury: GroupTreasury | null;
  groupId: string;
  isAdmin?: boolean;
  onContribute: (amount: number, description?: string) => Promise<void>;
  onDisburse: (amount: number, purpose: string, pollId?: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export function TreasuryPanel({ treasury, groupId, isAdmin, onContribute, onDisburse, loading, error }: TreasuryPanelProps) {
  const [showContribute, setShowContribute] = useState(false);
  const [showDisburse, setShowDisburse] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeDesc, setContributeDesc] = useState('');
  const [disburseAmount, setDisburseAmount] = useState('');
  const [disbursePurpose, setDisbursePurpose] = useState('');
  const [disbursePollId, setDisbursePollId] = useState('');

  const balance = treasury?.balance ?? 0;
  const totalRaised = treasury?.totalRaised ?? 0;

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
    <div>
      {error && <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}

      {/* Balance summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ padding: '0.875rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-surface)' }}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--embr-muted-text)' }}>Current Balance</p>
          <p style={{ margin: 0, fontWeight: '800', fontSize: '1.4rem', color: 'var(--embr-text)' }}>${(balance / 100).toFixed(2)}</p>
        </div>
        <div style={{ padding: '0.875rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-surface)' }}>
          <p style={{ margin: '0 0 0.25rem', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--embr-muted-text)' }}>Total Raised</p>
          <p style={{ margin: 0, fontWeight: '800', fontSize: '1.4rem', color: 'var(--embr-text)' }}>${(totalRaised / 100).toFixed(2)}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={() => { setShowContribute((v) => !v); setShowDisburse(false); }} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}>
          + Contribute
        </button>
        {isAdmin && (
          <button onClick={() => { setShowDisburse((v) => !v); setShowContribute(false); }} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}>
            Disburse Funds
          </button>
        )}
      </div>

      {/* Contribute form */}
      {showContribute && (
        <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-surface)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Amount ($)</label>
            <input style={inputStyle} type="number" min="1" step="0.01" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} placeholder="10.00" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Note (optional)</label>
            <input style={inputStyle} value={contributeDesc} onChange={(e) => setContributeDesc(e.target.value)} placeholder="For the upcoming event..." />
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>Embr takes 2%. 98% goes directly to the group treasury.</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={async () => { await onContribute(Math.round(parseFloat(contributeAmount || '0') * 100), contributeDesc || undefined); setShowContribute(false); setContributeAmount(''); setContributeDesc(''); }}
              disabled={loading || !contributeAmount || parseFloat(contributeAmount) < 1}
              style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}
            >
              {loading ? 'Processing...' : 'Contribute'}
            </button>
            <button onClick={() => setShowContribute(false)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Disburse form */}
      {showDisburse && (
        <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-surface)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Amount ($)</label>
            <input style={inputStyle} type="number" min="0.01" step="0.01" value={disburseAmount} onChange={(e) => setDisburseAmount(e.target.value)} placeholder="50.00" />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Purpose *</label>
            <input style={inputStyle} value={disbursePurpose} onChange={(e) => setDisbursePurpose(e.target.value)} placeholder="Venue deposit for October meetup" required />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.35rem' }}>Poll ID (required for $50+)</label>
            <input style={inputStyle} value={disbursePollId} onChange={(e) => setDisbursePollId(e.target.value)} placeholder="Paste the approving poll's ID" />
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>Disbursements of $50+ require a closed group poll for approval.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={async () => { await onDisburse(Math.round(parseFloat(disburseAmount || '0') * 100), disbursePurpose, disbursePollId || undefined); setShowDisburse(false); setDisburseAmount(''); setDisbursePurpose(''); setDisbursePollId(''); }}
              disabled={loading || !disburseAmount || !disbursePurpose}
              style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-warm-1, #c2410c)', color: '#fff', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}
            >
              {loading ? 'Processing...' : 'Disburse'}
            </button>
            <button onClick={() => setShowDisburse(false)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Transaction history */}
      {treasury && treasury.transactions.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 0.625rem', fontWeight: '700', fontSize: '0.875rem', color: 'var(--embr-muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent Transactions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {treasury.transactions.map((tx) => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-surface)' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem' }}>{tx.description}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>
                    {TREASURY_TRANSACTION_LABELS[tx.type]} · {new Date(tx.createdAt).toLocaleDateString()}
                    {tx.contributor && ` · by ${tx.contributor.profile?.displayName || tx.contributor.username}`}
                  </p>
                </div>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: tx.type === 'CONTRIBUTION' ? '#059669' : tx.type === 'DISBURSEMENT' ? '#ef4444' : 'var(--embr-muted-text)', flexShrink: 0, marginLeft: '1rem' }}>
                  {tx.type === 'CONTRIBUTION' ? '+' : '-'}${(tx.amount / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!treasury || treasury.transactions.length === 0 && (
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--embr-muted-text)', textAlign: 'center', padding: '1.5rem 0' }}>
          No transactions yet. Be the first to contribute!
        </p>
      )}
    </div>
  );
}
