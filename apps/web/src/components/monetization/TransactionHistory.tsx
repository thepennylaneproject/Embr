import React, { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import type { TransactionType } from '@shared/types/monetization.types';

export const TransactionHistory: React.FC = () => {
  const { transactions, isLoading, loadTransactions } = useWallet();
  const [filter, setFilter] = useState<TransactionType | 'ALL'>('ALL');

  useEffect(() => {
    const filters = filter === 'ALL' ? {} : { type: filter as TransactionType };
    loadTransactions(filters);
  }, [filter, loadTransactions]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'TIP_RECEIVED':
      case 'CREDIT':
        return '↓';
      case 'TIP_SENT':
      case 'PAYOUT':
      case 'DEBIT':
        return '↑';
      case 'FEE':
        return '⚡';
      case 'REFUND':
        return '↩';
      default:
        return '•';
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="h-5 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header with Filters */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction History</h2>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['ALL', 'TIP_RECEIVED', 'TIP_SENT', 'PAYOUT', 'FEE', 'REFUND'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type as TransactionType | 'ALL')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${
                  filter === type
                    ? 'bg-[#E8998D] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="divide-y divide-gray-200">
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">💸</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-600">
              Your transaction history will appear here once you start earning or spending.
            </p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold
                      ${
                        transaction.amount > 0
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                  >
                    {getTransactionIcon(transaction.type)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {transaction.description}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(transaction.createdAt)}
                    </p>
                    {transaction.referenceType && (
                      <p className="text-xs text-gray-500 mt-1">
                        Ref: {transaction.referenceType}
                      </p>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right ml-4">
                  <p
                    className={`text-lg font-semibold ${getTransactionColor(
                      transaction.amount,
                    )}`}
                  >
                    {transaction.amount > 0 ? '+' : ''}$
                    {Math.abs(transaction.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 uppercase">
                    {transaction.type.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
                <div className="mt-2 ml-14 text-xs text-gray-500">
                  {Object.entries(transaction.metadata).map(([key, value]) => (
                    <span key={key} className="mr-3">
                      {key}: {String(value)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {transactions.length > 0 && (
        <div className="p-4 border-t border-gray-200 text-center">
          <button
            onClick={() => loadTransactions({ page: 2 })}
            className="text-sm text-[#E8998D] hover:text-[#d88578] font-medium"
          >
            Load more transactions
          </button>
        </div>
      )}
    </div>
  );
};
