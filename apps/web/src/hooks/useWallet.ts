import { useState, useEffect, useCallback } from 'react';
import { walletApi } from '@shared/api/monetization.api';
import { getApiErrorMessage } from '@/lib/api/error';
import type {
  WalletBalance,
  WalletStats,
  Transaction,
  TransactionType,
} from '@shared/types/monetization.types';

interface TransactionPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UseWalletReturn {
  balance: WalletBalance | null;
  stats: WalletStats | null;
  transactions: Transaction[];
  pagination: TransactionPagination | null;
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
  loadNextPage: () => Promise<void>;
}

export function useWallet(): UseWalletReturn {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<TransactionPagination | null>(null);
  const [currentFilters, setCurrentFilters] = useState<{
    type?: TransactionType;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }>({});
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

  /**
   * Load transactions. When called without a page (or page=1) replaces the
   * current list and remembers the filter settings. When called with page>1
   * appends to the existing list (load-more behaviour).
   */
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
        const page = filters?.page ?? 1;
        const data = await walletApi.getTransactions(filters);

        if (page > 1) {
          // Append new page results to existing list
          setTransactions((prev) => [...prev, ...data.transactions]);
        } else {
          // New filter or first page — replace the list and save filters
          setTransactions(data.transactions);
          setCurrentFilters({
            type: filters?.type,
            startDate: filters?.startDate,
            endDate: filters?.endDate,
            limit: filters?.limit,
          });
        }

        setPagination(data.pagination);
      } catch (err: any) {
        setError(getApiErrorMessage(err, 'Could not load transactions. Please refresh.'));
      } finally {
        setIsLoadingTransactions(false);
      }
    },
    [],
  );

  /**
   * Fetch the next page of transactions using the current filter settings.
   */
  const loadNextPage = useCallback(async () => {
    if (!pagination) return;
    const nextPage = pagination.page + 1;
    if (nextPage > pagination.totalPages) return;

    await loadTransactions({ ...currentFilters, page: nextPage });
  }, [pagination, currentFilters, loadTransactions]);

  // Initial load
  useEffect(() => {
    const loadWalletData = async () => {
      setIsLoading(true);
      // Use allSettled to ensure partial data loads even if one call fails
      await Promise.allSettled([refetchBalance(), refetchStats(), loadTransactions()]);
      setIsLoading(false);
    };

    loadWalletData();
  }, [refetchBalance, refetchStats, loadTransactions]);

  return {
    balance,
    stats,
    transactions,
    pagination,
    isLoading,
    isLoadingBalance,
    isLoadingStats,
    isLoadingTransactions,
    error,
    refetchBalance,
    refetchStats,
    loadTransactions,
    loadNextPage,
  };
}
