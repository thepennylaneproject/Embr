/**
 * EarningsOverview Component
 * Shows creator earnings with transparent breakdown
 * Design: Follow DESIGN_SYSTEM - typography hierarchy, whitespace, clarity
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useAnalytics } from '@/hooks/useAnalytics';
import { CreatorOnboarding } from '@/components/onboarding/CreatorOnboarding';
import { AnalyticsEvent } from '@/lib/analytics';
import { isMusicEnabled } from '@/lib/features';

interface EarningsOverviewProps {
  onRequestPayout?: () => void;
  onViewTransactions?: () => void;
}

export const EarningsOverview: React.FC<EarningsOverviewProps> = ({
  onRequestPayout,
  onViewTransactions,
}) => {
  const { user } = useAuth();
  const { balance, stats, isLoading, error, refetchBalance } = useWallet();
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [hasTrackedFirstEarning, setHasTrackedFirstEarning] = useState(false);
  const analytics = useAnalytics();

  // Show onboarding if user has never earned (totalEarned = 0)
  const isNewCreator = !stats?.totalEarned || stats.totalEarned === 0;

  // Track first earning event
  useEffect(() => {
    if (!hasTrackedFirstEarning && stats?.totalEarned && stats.totalEarned > 0) {
      analytics.track(AnalyticsEvent.FIRST_EARNING, {
        amount: stats.totalEarned,
      });
      setHasTrackedFirstEarning(true);
    }
  }, [stats?.totalEarned, hasTrackedFirstEarning, analytics]);

  if (isLoading) {
    return (
      <div style={{ padding: '32px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <div style={{ height: '48px', backgroundColor: '#e0e0e0', borderRadius: '4px', marginBottom: '16px' }} />
        <div style={{ height: '24px', backgroundColor: '#e0e0e0', borderRadius: '4px', marginBottom: '32px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: '16px', color: '#ef4444', marginBottom: '16px' }}>⚠️ Error loading earnings</p>
        <p style={{ fontSize: '14px', color: '#999', marginBottom: '24px' }}>{error}</p>
        <button
          onClick={refetchBalance}
          style={{
            padding: '8px 16px',
            backgroundColor: '#E8998D',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const totalEarned = balance?.available || 0;
  const platformFee = stats?.totalEarned ? stats.totalEarned * 0.02 : 0;
  const processorFee = stats?.totalEarned ? stats.totalEarned * 0.03 : 0;

  return (
    <div>
      {/* ONBOARDING - for new creators */}
      {isNewCreator && !onboardingComplete && user && (
        <CreatorOnboarding
          userId={user.id}
          onComplete={() => setOnboardingComplete(true)}
        />
      )}

      {/* MAIN EARNINGS NUMBER - BIG, CLEAR */}
      <div style={{ marginBottom: '64px' }}>
        <p style={{ fontSize: '14px', fontWeight: 500, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
          This Month
        </p>
        <h2 style={{ fontSize: '48px', fontWeight: 700, color: '#000', margin: '0 0 24px 0' }}>
          ${totalEarned.toFixed(2)}
        </h2>
        {balance && balance.pending > 0 && (
          <p style={{ fontSize: '14px', color: '#999' }}>
            ${balance.pending.toFixed(2)} pending
          </p>
        )}
      </div>

      {/* EARNINGS BY SOURCE */}
      <section style={{ marginBottom: '64px', paddingBottom: '64px', borderBottom: '1px solid #e0e0e0' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 600, color: '#000', marginBottom: '24px' }}>
          Where It Came From
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* Gigs */}
          <div>
            <p style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>Gigs & Services</p>
            <p style={{ fontSize: '28px', fontWeight: 600, color: '#000' }}>
              ${(stats?.gigsEarnings || 0).toFixed(2)}
            </p>
            <p style={{ fontSize: '12px', color: '#ccc', marginTop: '8px' }}>
              {stats?.numberOfGigs || 0} completed
            </p>
          </div>

          {/* Tips */}
          <div>
            <p style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>Tips & Patronage</p>
            <p style={{ fontSize: '28px', fontWeight: 600, color: '#000' }}>
              ${(stats?.tipsEarnings || 0).toFixed(2)}
            </p>
            <p style={{ fontSize: '12px', color: '#ccc', marginTop: '8px' }}>
              {stats?.numberOfTips || 0} supporters
            </p>
          </div>

          {isMusicEnabled() && (
            <div>
              <p style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>Music Licensing</p>
              <p style={{ fontSize: '28px', fontWeight: 600, color: '#000' }}>
                ${(stats?.musicEarnings || 0).toFixed(2)}
              </p>
              <p style={{ fontSize: '12px', color: '#ccc', marginTop: '8px' }}>
                {stats?.musicDownloads || 0} downloads
              </p>
            </div>
          )}

          {/* Subscriptions (future) */}
          <div>
            <p style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>Subscriptions</p>
            <p style={{ fontSize: '28px', fontWeight: 600, color: '#000' }}>
              ${(stats?.subscriptionEarnings || 0).toFixed(2)}
            </p>
            <p style={{ fontSize: '12px', color: '#ccc', marginTop: '8px' }}>
              {stats?.activeSubscribers || 0} subscribers
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <p style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>Digital Sales</p>
            <p style={{ fontSize: '28px', fontWeight: 600, color: '#000' }}>
              ${(stats?.marketplaceEarnings || 0).toFixed(2)}
            </p>
            <p style={{ fontSize: '12px', color: '#ccc', marginTop: '8px' }}>
              {stats?.salesCount || 0} sales
            </p>
          </div>
        </div>
      </section>

      {/* FEE TRANSPARENCY */}
      <section style={{ marginBottom: '64px', paddingBottom: '64px', borderBottom: '1px solid #e0e0e0' }}>
        <h3 style={{ fontSize: '24px', fontWeight: 600, color: '#000', marginBottom: '24px' }}>
          Fees Breakdown
        </h3>

        <p style={{ fontSize: '14px', color: '#999', marginBottom: '24px' }}>
          Transparent breakdown of what you earned vs. what fees are taken.
        </p>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontSize: '16px', color: '#333' }}>Gross Earnings</span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#000' }}>
              ${(stats?.totalEarned || 0).toFixed(2)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <span style={{ fontSize: '16px', color: '#333' }}>Embr Platform Fee (2%)</span>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Covers servers, team, development</p>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444' }}>
              -${platformFee.toFixed(2)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <span style={{ fontSize: '16px', color: '#333' }}>Payment Processor (3%)</span>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Stripe/payment gateway</p>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444' }}>
              -${processorFee.toFixed(2)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px' }}>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#000' }}>You Keep</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>
              ${(totalEarned).toFixed(2)}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
            <strong>Total fees:</strong> {((5).toFixed(1))}% (Platform 2% + Processor 3%)
            <br />
            <strong>Keep:</strong> {((95).toFixed(1))}%
          </p>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '8px', marginBottom: 0 }}>
            Compare: Patreon 10.2%, Substack 10%, YouTube 45%, Spotify 70%
          </p>
        </div>
      </section>

      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <button
          onClick={onRequestPayout}
          disabled={!balance || balance.available < 10}
          style={{
            flex: 1,
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 600,
            backgroundColor: balance && balance.available >= 10 ? '#E8998D' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: balance && balance.available >= 10 ? 'pointer' : 'not-allowed',
            transition: 'background-color 200ms',
          }}
        >
          Withdraw ${balance?.available.toFixed(2) || '0.00'} to Bank
        </button>
        <button
          onClick={onViewTransactions}
          style={{
            flex: 1,
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 600,
            backgroundColor: 'transparent',
            color: '#E8998D',
            border: '2px solid #E8998D',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 200ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E8998D';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#E8998D';
          }}
        >
          View History
        </button>
      </div>

      {/* INFO BANNER */}
      {balance && balance.available > 0 && balance.available < 10 && (
        <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', borderRadius: '4px' }}>
          <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
            Minimum payout is $10. You have ${balance.available.toFixed(2)}. Keep creating!
          </p>
        </div>
      )}

      {balance && balance.available === 0 && (
        <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
            No earnings yet. <a href="/create" style={{ color: '#E8998D', textDecoration: 'none' }}>Create</a> or <a href="/gigs" style={{ color: '#E8998D', textDecoration: 'none' }}>offer a gig</a> to start earning.
          </p>
        </div>
      )}
    </div>
  );
};

export default EarningsOverview;
