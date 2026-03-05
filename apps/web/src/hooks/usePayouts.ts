import { useState, useCallback } from 'react';
import { payoutsApi } from '@shared/api/monetization.api';
import type {
  Payout,
  CreatePayoutRequest,
  PayoutStats,
} from '@shared/types/monetization.types';

interface UsePayoutsReturn {
  createPayoutRequest: (amount: number, note?: string) => Promise<Payout>;
  getPayoutStats: () => Promise<PayoutStats>;
  isCreating: boolean;
  isLoadingStats: boolean;
  error: string | null;
}

export function usePayouts(): UsePayoutsReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayoutRequest = useCallback(
    async (amount: number, note?: string): Promise<Payout> => {
      if (amount < 10) {
        const errorMessage = 'Minimum payout amount is $10';
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      setIsCreating(true);
      setError(null);

      try {
        const request: CreatePayoutRequest = { amount, note };
        const payout = await payoutsApi.createRequest(request);
        return payout;
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to create payout request';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  const getPayoutStats = useCallback(async (): Promise<PayoutStats> => {
    setIsLoadingStats(true);
    try {
      setError(null);
      const stats = await payoutsApi.getStats();
      return stats;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load payout stats';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  return {
    createPayoutRequest,
    getPayoutStats,
    isCreating,
    isLoadingStats,
    error,
  };
}
