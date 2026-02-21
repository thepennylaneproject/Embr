import { useState } from 'react';
import { ProtectedPageShell } from '@/components/layout';
import { WalletOverview } from '@/components/monetization/WalletOverview';
import { TransactionHistory } from '@/components/monetization/TransactionHistory';
import { PayoutRequest } from '@/components/monetization/PayoutRequest';
import { Button } from '@/components/ui';

type WalletView = 'summary' | 'transactions' | 'payout';

export default function WalletPage() {
  const [activeView, setActiveView] = useState<WalletView>('summary');

  return (
    <ProtectedPageShell
      title="Wallet"
      subtitle="Track your earnings, tips, and payouts."
      breadcrumbs={[{ label: 'Wallet' }]}
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
