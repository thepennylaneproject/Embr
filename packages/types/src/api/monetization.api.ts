import axios from "axios";
import type {
  WalletBalance,
  WalletStats,
  TransactionsResponse,
  CreateTipRequest,
  Tip,
  TipsResponse,
  TipStats,
  CreatePayoutRequest,
  Payout,
  PayoutsResponse,
  PayoutStats,
  StripeConnectAccountStatus,
  StripeConnectAccountDetails,
  CreateStripeConnectAccountRequest,
  CreateStripeConnectAccountResponse,
  TransactionType,
  PayoutStatus,
} from "../types/monetization.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003";

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Wallet API
export const walletApi = {
  getBalance: async (): Promise<WalletBalance> => {
    const { data } = await api.get("/wallet/balance");
    return data;
  },

  getStats: async (): Promise<WalletStats> => {
    const { data } = await api.get("/wallet/stats");
    return data;
  },

  getTransactions: async (params?: {
    type?: TransactionType;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<TransactionsResponse> => {
    const { data } = await api.get("/wallet/transactions", { params });
    return data;
  },

  getFinancialSummary: async (startDate?: string, endDate?: string) => {
    const { data } = await api.get("/wallet/financial-summary", {
      params: { startDate, endDate },
    });
    return data;
  },

  verifyIntegrity: async () => {
    const { data } = await api.get("/wallet/verify-integrity");
    return data;
  },

  getTopEarners: async (limit?: number, period?: string) => {
    const { data } = await api.get("/wallet/top-earners", {
      params: { limit, period },
    });
    return data;
  },
};

// Tips API
export const tipsApi = {
  create: async (request: CreateTipRequest): Promise<Tip> => {
    const { data } = await api.post("/tips", request);
    return data;
  },

  getTips: async (params?: {
    type?: "sent" | "received";
    postId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<TipsResponse> => {
    const { data } = await api.get("/tips", { params });
    return data;
  },

  getStats: async (startDate?: string, endDate?: string): Promise<TipStats> => {
    const { data } = await api.get("/tips/stats", {
      params: { startDate, endDate },
    });
    return data;
  },

  getTipsByPost: async (postId: string): Promise<TipsResponse> => {
    const { data } = await api.get(`/tips/post/${postId}`);
    return data;
  },

  getTipsReceivedByUser: async (userId: string): Promise<TipsResponse> => {
    const { data } = await api.get(`/tips/user/${userId}/received`);
    return data;
  },

  refund: async (tipId: string, reason: string): Promise<Tip> => {
    const { data } = await api.post(`/tips/${tipId}/refund`, { reason });
    return data;
  },
};

// Payouts API
export const payoutsApi = {
  createRequest: async (request: CreatePayoutRequest): Promise<Payout> => {
    const { data } = await api.post("/payouts/request", request);
    return data;
  },

  getPayouts: async (params?: {
    status?: PayoutStatus;
    page?: number;
    limit?: number;
  }): Promise<PayoutsResponse> => {
    const { data } = await api.get("/payouts", { params });
    return data;
  },

  getStats: async (): Promise<PayoutStats> => {
    const { data } = await api.get("/payouts/stats");
    return data;
  },

  getPending: async (): Promise<Payout[]> => {
    const { data } = await api.get("/payouts/pending");
    return data;
  },

  approve: async (
    payoutId: string,
    approve: boolean = true,
  ): Promise<Payout> => {
    const { data } = await api.post(`/payouts/${payoutId}/approve`, {
      approve,
    });
    return data;
  },

  reject: async (payoutId: string, reason?: string): Promise<Payout> => {
    const { data } = await api.post(`/payouts/${payoutId}/reject`, {
      reason,
    });
    return data;
  },
};

// Stripe Connect API
export const stripeConnectApi = {
  createAccount: async (
    request: CreateStripeConnectAccountRequest,
  ): Promise<CreateStripeConnectAccountResponse> => {
    const { data } = await api.post("/stripe-connect/account", request);
    return data;
  },

  getStatus: async (): Promise<StripeConnectAccountStatus> => {
    const { data } = await api.get("/stripe-connect/status");
    return data;
  },

  getDetails: async (): Promise<StripeConnectAccountDetails> => {
    const { data } = await api.get("/stripe-connect/account");
    return data;
  },

  getAccountLink: async (
    returnUrl: string,
    refreshUrl: string,
  ): Promise<{ url: string }> => {
    const { data } = await api.post("/stripe-connect/account-link", {
      returnUrl,
      refreshUrl,
    });
    return data;
  },

  completeOnboarding: async () => {
    const { data } = await api.post("/stripe-connect/complete");
    return data;
  },

  deleteAccount: async (): Promise<void> => {
    await api.delete("/stripe-connect/account");
  },
};
