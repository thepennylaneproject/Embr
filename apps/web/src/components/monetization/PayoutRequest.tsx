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
      }, 3004);
    } catch (err) {
      console.error('Error creating payout request:', err);
    }
  };

  const canRequestPayout =
    balance &&
    balance.available >= 10 &&
    stripeStatus?.payoutsEnabled;

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      PROCESSING: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      FAILED: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  if (showSuccess) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Payout Request Submitted!
        </h3>
        <p className="text-gray-600 mb-6">
          Your payout request is being reviewed. You'll be notified once it's processed.
        </p>
      </div>
    );
  }

  if (!stripeStatus?.payoutsEnabled) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">💳</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Payment Account Required
          </h3>
          <p className="text-gray-600 mb-6">
            You need to set up your payment account before requesting payouts.
          </p>
          <button className="px-6 py-2 bg-[#E8998D] text-white rounded-lg font-medium hover:bg-[#d88578] transition-colors">
            Set Up Payment Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payout Request Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">
          Request Payout
        </h3>

        {/* Available Balance Display */}
        <div className="mb-6 p-4 bg-gradient-to-br from-[#E8998D] to-[#C9ADA7] rounded-lg text-white">
          <p className="text-sm opacity-90 mb-1">Available Balance</p>
          <p className="text-3xl font-bold">
            ${balance?.available?.toFixed(2) || '0.00'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payout Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                $
              </span>
              <input
                type="number"
                step="1"
                min="10"
                max={balance?.available || 0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 text-lg border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
                required
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Minimum: $10</span>
              <span>Maximum: ${balance?.available?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            {[25, 50, 100].map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setAmount(quickAmount.toString())}
                disabled={!balance || balance.available < quickAmount}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium
                         hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ${quickAmount}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(balance?.available?.toFixed(2) || '0')}
              disabled={!balance || balance.available < 10}
              className="flex-1 px-4 py-2 border border-[#E8998D] text-[#E8998D] rounded-lg text-sm font-medium
                       hover:bg-[#E8998D] hover:text-white transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Max
            </button>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for reference..."
              rows={3}
              maxLength={200}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none
                       focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {note.length}/200
            </p>
          </div>

          {/* Error Message */}
          {payoutError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{payoutError}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isCreating || !canRequestPayout}
            className="w-full py-3 bg-[#E8998D] text-white rounded-lg font-semibold
                     hover:bg-[#d88578] transition-colors disabled:opacity-50
                     disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Request Payout</span>
              </>
            )}
          </button>
        </form>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 Payouts are typically processed within 2-5 business days after approval.
            You'll receive a notification once your request is reviewed.
          </p>
        </div>
      </div>

      {/* Recent Payouts */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Payouts
        </h3>

        {isLoadingPayouts ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : recentPayouts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-gray-600">No payout requests yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentPayouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    ${payout.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatDate(payout.createdAt)}
                  </p>
                  {payout.note && (
                    <p className="text-xs text-gray-500 mt-1">{payout.note}</p>
                  )}
                </div>
                {getStatusBadge(payout.status)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
