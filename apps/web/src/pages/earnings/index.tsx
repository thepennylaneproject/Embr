import { useState } from 'react';
import { ProtectedPageShell } from '@/components/layout';
import { WalletOverview } from '@/components/monetization/WalletOverview';
import { TransactionHistory } from '@/components/monetization/TransactionHistory';
import { PayoutRequest } from '@/components/monetization/PayoutRequest';
import { Button } from '@/components/ui';

type EarningsView = 'summary' | 'transactions' | 'payout';

export default function EarningsPage() {
  const [activeView, setActiveView] = useState<EarningsView>('summary');

  return (
    <ProtectedPageShell
      title="Earnings"
      subtitle="See where your money comes from. Transparent breakdown, zero hidden fees."
      breadcrumbs={[{ label: 'Earnings' }]}
    >
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(
          [
            { key: 'summary', label: 'Summary' },
            { key: 'transactions', label: 'Transactions' },
            { key: 'payout', label: 'Request Payout' },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.key}
            type="button"
            variant={activeView === tab.key ? 'primary' : 'secondary'}
            onClick={() => setActiveView(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeView === 'summary' && (
        <WalletOverview
          onViewTransactions={() => setActiveView('transactions')}
          onRequestPayout={() => setActiveView('payout')}
        />
      )}

      {activeView === 'transactions' && <TransactionHistory />}

      {activeView === 'payout' && <PayoutRequest />}
    </ProtectedPageShell>
  );
}
