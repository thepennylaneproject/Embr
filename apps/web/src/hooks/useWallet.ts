import { useState, useEffect, useCallback } from 'react';
import { walletApi } from '@shared/api/monetization.api';
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
  const [error, setError] = useState<string | null>(null);

  const refetchBalance = useCallback(async () => {
    try {
      setError(null);
      const data = await walletApi.getBalance();
      setBalance(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load balance');
      console.error('Error fetching balance:', err);
    }
  }, []);

  const refetchStats = useCallback(async () => {
    try {
      setError(null);
      const data = await walletApi.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load stats');
      console.error('Error fetching stats:', err);
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
      try {
        setError(null);
        setIsLoading(true);
        const data = await walletApi.getTransactions(filters);
        setTransactions(data.transactions);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load transactions');
        console.error('Error fetching transactions:', err);
      } finally {
        setIsLoading(false);
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
    error,
    refetchBalance,
    refetchStats,
    loadTransactions,
  };
}
