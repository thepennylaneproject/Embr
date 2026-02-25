/**
 * PayoutRequest Component
 * Allows creators to withdraw earned money
 * Design: Follow DESIGN_SYSTEM - clean, minimal, typography hierarchy
 */

import React, { useState, useEffect } from 'react';
import { usePayouts } from '@/hooks/usePayouts';
import { useWallet } from '@/hooks/useWallet';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { payoutsApi } from '@shared/api/monetization.api';
import type { Payout } from '@shared/types/monetization.types';

export const PayoutRequest: React.FC = () => {
  const { balance } = useWallet();
  const { status: stripeStatus } = useStripeConnect();
  const { createPayoutRequest, isCreating, error: payoutError } = usePayouts();
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [recentPayouts, setRecentPayouts] = useState<Payout[]>([]);
  const [isLoadingPayouts, setIsLoadingPayouts] = useState(true);

  useEffect(() => {
    loadRecentPayouts();
  }, []);

  const loadRecentPayouts = async () => {
    try {
      setIsLoadingPayouts(true);
      const response = await payoutsApi.getPayouts({ limit: 5 });
      setRecentPayouts(response.payouts);
    } catch (err) {
      console.error('Error loading payouts:', err);
    } finally {
      setIsLoadingPayouts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountValue = parseFloat(amount);

    if (isNaN(amountValue) || amountValue < 10) {
      alert('Minimum payout amount is $10');
      return;
    }

    if (!balance || amountValue > balance.available) {
      alert('Insufficient available balance');
      return;
    }

    try {
      await createPayoutRequest(amountValue, note.trim() || undefined);
      setShowSuccess(true);
      setAmount('');
      setNote('');
      setTimeout(() => {
        setShowSuccess(false);
        loadRecentPayouts();
      }, 3000);
    } catch (err) {
      console.error('Error creating payout request:', err);
    }
  };

  const canRequestPayout =
    balance &&
    balance.available >= 10 &&
    stripeStatus?.payoutsEnabled;

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COMPLETED': return '#22c55e';
      case 'PROCESSING': return '#3b82f6';
      case 'APPROVED': return '#3b82f6';
      case 'PENDING': return '#f59e0b';
      case 'REJECTED':
      case 'FAILED': return '#ef4444';
      default: return '#999';
    }
  };

  // SUCCESS STATE
  if (showSuccess) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: '48px', margin: 0 }}>🎉</p>
        <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#000', margin: '16px 0 8px 0' }}>
          Payout Submitted!
        </h3>
        <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
          Your request is being reviewed. You'll be notified when it's processed.
        </p>
      </div>
    );
  }

  // STRIPE NOT CONNECTED
  if (!stripeStatus?.payoutsEnabled) {
    return (
      <div style={{ padding: '48px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: '48px', margin: 0 }}>💳</p>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#000', margin: '16px 0 8px 0' }}>
          Set Up Payment Account
        </h3>
        <p style={{ fontSize: '16px', color: '#666', margin: '0 0 24px 0' }}>
          You need to connect your bank account before requesting payouts.
        </p>
        <button
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            fontWeight: 600,
            backgroundColor: '#E8998D',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Connect Bank Account
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* REQUEST FORM */}
      <div style={{ marginBottom: '64px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#000', marginBottom: '24px' }}>
          Request Payout
        </h3>

        {/* AVAILABLE BALANCE */}
        <div style={{
          padding: '24px',
          backgroundColor: '#fff9e6',
          border: '2px solid #E8998D',
          borderRadius: '8px',
          marginBottom: '32px',
        }}>
          <p style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>
            Available Balance
          </p>
          <p style={{ fontSize: '32px', fontWeight: 700, color: '#000', margin: 0 }}>
            ${balance?.available.toFixed(2) || '0.00'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '24px' }}>
          {/* AMOUNT INPUT */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '8px' }}>
              Amount to Withdraw
            </label>
            <input
              type="number"
              step="1"
              min="10"
              max={balance?.available || 0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                marginBottom: '8px',
              }}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999' }}>
              <span>Minimum: $10</span>
              <span>Maximum: ${balance?.available?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          {/* QUICK AMOUNT BUTTONS */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[25, 50, 100].map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setAmount(quickAmount.toString())}
                disabled={!balance || balance.available < quickAmount}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: 'white',
                  color: '#333',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  cursor: balance && balance.available >= quickAmount ? 'pointer' : 'not-allowed',
                  opacity: balance && balance.available >= quickAmount ? 1 : 0.5,
                }}
              >
                ${quickAmount}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(balance?.available?.toFixed(2) || '0')}
              disabled={!balance || balance.available < 10}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor: balance && balance.available >= 10 ? '#E8998D' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: balance && balance.available >= 10 ? 'pointer' : 'not-allowed',
                opacity: balance && balance.available >= 10 ? 1 : 0.7,
              }}
            >
              Max
            </button>
          </div>

          {/* NOTE */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '8px' }}>
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for reference..."
              maxLength={200}
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '8px',
              }}
            />
            <p style={{ fontSize: '12px', color: '#999', textAlign: 'right', margin: 0 }}>
              {note.length}/200
            </p>
          </div>

          {/* ERROR */}
          {payoutError && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px' }}>
              <p style={{ fontSize: '14px', color: '#991b1b', margin: 0 }}>{payoutError}</p>
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={isCreating || !canRequestPayout}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              backgroundColor: canRequestPayout ? '#E8998D' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: canRequestPayout ? 'pointer' : 'not-allowed',
            }}
          >
            {isCreating ? 'Processing...' : `Withdraw $${amount || '0.00'}`}
          </button>

          <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              <strong>Processing time:</strong> 2-5 business days after approval.
            </p>
          </div>
        </form>
      </div>

      {/* RECENT PAYOUTS */}
      <section style={{ paddingTop: '64px', borderTop: '1px solid #e0e0e0' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#000', marginBottom: '24px' }}>
          Payout History
        </h3>

        {isLoadingPayouts ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <p style={{ fontSize: '14px', color: '#999' }}>Loading history...</p>
          </div>
        ) : recentPayouts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <p style={{ fontSize: '16px', color: '#999' }}>No payouts requested yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {recentPayouts.map((payout) => (
              <div
                key={payout.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: '#000', margin: '0 0 4px 0' }}>
                    ${payout.amount.toFixed(2)}
                  </p>
                  <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
                    {formatDate(payout.createdAt)}
                  </p>
                  {payout.note && (
                    <p style={{ fontSize: '12px', color: '#ccc', margin: '4px 0 0 0' }}>
                      {payout.note}
                    </p>
                  )}
                </div>
                <div style={{
                  padding: '4px 12px',
                  backgroundColor: getStatusColor(payout.status),
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {payout.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PayoutRequest;
