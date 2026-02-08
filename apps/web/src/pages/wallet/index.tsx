import { useState } from 'react';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { WalletOverview } from '@/components/monetization/WalletOverview';
import { TransactionHistory } from '@/components/monetization/TransactionHistory';
import { PayoutRequest } from '@/components/monetization/PayoutRequest';

type WalletView = 'summary' | 'transactions' | 'payout';

export default function WalletPage() {
  const [activeView, setActiveView] = useState<WalletView>('summary');

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
            <p className="text-sm text-gray-500">
              Track your earnings, tips, and payouts.
            </p>
          </header>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'summary', label: 'Summary' },
                { key: 'transactions', label: 'Transactions' },
                { key: 'payout', label: 'Request payout' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeView === tab.key
                    ? 'bg-[#E8998D] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
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
        </div>
      </main>
    </ProtectedRoute>
  );
}
