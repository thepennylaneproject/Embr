import { useState, useEffect, useCallback } from 'react';
import { walletApi } from '@shared/api/monetization.api';
import { getApiErrorMessage } from '@/lib/api/error';
import type {
  WalletBalance,
  WalletStats,
  Transaction,
  TransactionType,
} from '@shared/types/monetization.types';

interface UseWalletReturn {
  balance: WalletBalance | null;
  stats: WalletStats | null;
  transactions: Transaction[];
  isLoading: boolean;
  isLoadingBalance: boolean;
  isLoadingStats: boolean;
  isLoadingTransactions: boolean;
  error: string | null;
  refetchBalance: () => Promise<void>;
  refetchStats: () => Promise<void>;
  loadTransactions: (filters?: {
    type?: TransactionType;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
}

export function useWallet(): UseWalletReturn {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetchBalance = useCallback(async () => {
    setIsLoadingBalance(true);
    try {
      setError(null);
      const data = await walletApi.getBalance();
      setBalance(data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not load your balance. Please refresh.'));
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  const refetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      setError(null);
      const data = await walletApi.getStats();
      setStats(data);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Could not load wallet stats. Please refresh.'));
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const loadTransactions = useCallback(
    async (filters?: {
      type?: TransactionType;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) => {
      setIsLoadingTransactions(true);
      try {
        setError(null);
        const data = await walletApi.getTransactions(filters);
        setTransactions(data.transactions);
      } catch (err: any) {
        setError(getApiErrorMessage(err, 'Could not load transactions. Please refresh.'));
      } finally {
        setIsLoadingTransactions(false);
      }
    },
    [],
  );

  // Initial load
  useEffect(() => {
    const loadWalletData = async () => {
      setIsLoading(true);
      // Use allSettled to ensure partial data loads even if one call fails
      // This prevents entire hook from becoming unusable if any single data fetch fails
      await Promise.allSettled([refetchBalance(), refetchStats(), loadTransactions()]);
      setIsLoading(false);
    };

    loadWalletData();
  }, [refetchBalance, refetchStats, loadTransactions]);

  return {
    balance,
    stats,
    transactions,
    isLoading,
    isLoadingBalance,
    isLoadingStats,
    isLoadingTransactions,
    error,
    refetchBalance,
    refetchStats,
    loadTransactions,
  };
}
