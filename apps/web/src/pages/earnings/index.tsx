import { useState } from 'react';
import { ProtectedPageShell } from '@/components/layout';
import { EarningsOverview } from '@/components/monetization/EarningsOverview';
import { TransactionHistory } from '@/components/monetization/TransactionHistory';
import { PayoutRequest } from '@/components/monetization/PayoutRequest';

type EarningsView = 'summary' | 'transactions' | 'payout';

export default function EarningsPage() {
  const [activeView, setActiveView] = useState<EarningsView>('summary');

  const navStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '48px',
    borderBottom: '1px solid #e0e0e0',
  };

  const navButtonStyle = (isActive: boolean) => ({
    padding: '8px 0',
    fontSize: '16px',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? '#000' : '#999',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: isActive ? '2px solid #E8998D' : 'none',
    cursor: 'pointer',
    paddingBottom: '12px',
    marginRight: '32px',
  });

  return (
    <ProtectedPageShell
      title="Earnings"
      subtitle="See where your money comes from. Transparent breakdown, zero hidden fees."
      breadcrumbs={[{ label: 'Earnings' }]}
    >
      <div style={navStyle}>
        <button style={navButtonStyle(activeView === 'summary')} onClick={() => setActiveView('summary')}>
          Summary
        </button>
        <button style={navButtonStyle(activeView === 'transactions')} onClick={() => setActiveView('transactions')}>
          Transactions
        </button>
        <button style={navButtonStyle(activeView === 'payout')} onClick={() => setActiveView('payout')}>
          Request Payout
        </button>
      </div>

      {activeView === 'summary' && (
        <EarningsOverview
          onViewTransactions={() => setActiveView('transactions')}
          onRequestPayout={() => setActiveView('payout')}
        />
      )}

      {activeView === 'transactions' && <TransactionHistory />}

      {activeView === 'payout' && <PayoutRequest />}
    </ProtectedPageShell>
  );
}
