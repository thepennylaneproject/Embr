import React from 'react';
import { useWallet } from '@/hooks/useWallet';

interface WalletOverviewProps {
  onRequestPayout?: () => void;
  onViewTransactions?: () => void;
}

export const WalletOverview: React.FC<WalletOverviewProps> = ({
  onRequestPayout,
  onViewTransactions,
}) => {
  const { balance, stats, isLoading, error, refetchBalance } = useWallet();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-12 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={refetchBalance}
            className="mt-4 text-sm text-[#E8998D] hover:text-[#d88578]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#E8998D] to-[#C9ADA7] p-6 text-white">
        <h2 className="text-lg font-medium mb-1">Wallet Balance</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">
            ${balance?.available?.toFixed(2) || '0.00'}
          </span>
          <span className="text-sm opacity-90">available</span>
        </div>
        {balance && (balance.pending || 0) > 0 && (
          <p className="text-sm mt-2 opacity-90">
            ${balance.pending?.toFixed(2) || '0.00'} pending in payouts
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-px bg-gray-200">
        <div className="bg-white p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">Total Earned</p>
          <p className="text-xl font-semibold text-gray-900">
            ${stats?.totalEarned?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-white p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">Tips Received</p>
          <p className="text-xl font-semibold text-gray-900">
            {stats?.numberOfTips || 0}
          </p>
        </div>
        <div className="bg-white p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">Avg Tip</p>
          <p className="text-xl font-semibold text-gray-900">
            ${stats?.averageTipReceived?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 bg-gray-50 flex gap-3">
        <button
          onClick={onRequestPayout}
          disabled={!balance || balance.available < 10}
          className="flex-1 px-4 py-2 bg-[#E8998D] text-white rounded-lg font-medium
                     hover:bg-[#d88578] transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Request Payout
        </button>
        <button
          onClick={onViewTransactions}
          className="flex-1 px-4 py-2 border-2 border-[#E8998D] text-[#E8998D] rounded-lg font-medium
                     hover:bg-[#E8998D] hover:text-white transition-colors"
        >
          View History
        </button>
      </div>

      {/* Info Banner */}
      {balance && balance.available < 10 && balance.available > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              Minimum payout amount is $10. Keep creating to reach the threshold!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
