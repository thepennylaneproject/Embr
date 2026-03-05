import { useState, useCallback } from 'react';
import { marketplaceApi } from '@shared/api/marketplace.api';
import { getApiErrorMessage } from '@/lib/api/error';
import type {
  MarketplaceListing,
  MarketplaceOrder,
  CreateListingInput,
  UpdateListingInput,
  ListingSearchParams,
  PaginatedListings,
} from '@embr/types';

export function useMarketplace() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createListing = useCallback(async (input: CreateListingInput): Promise<MarketplaceListing> => {
    setLoading(true);
    setError(null);
    try {
      return await marketplaceApi.createListing(input);
    } catch (e: any) {
      const msg = getApiErrorMessage(e, 'Failed to create listing');
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const publishListing = useCallback(async (id: string): Promise<MarketplaceListing> => {
    setLoading(true);
    try {
      return await marketplaceApi.publishListing(id);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to publish listing'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getListings = useCallback(async (params?: ListingSearchParams): Promise<PaginatedListings> => {
    setLoading(true);
    setError(null);
    try {
      return await marketplaceApi.getListings(params);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to load listings'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getListing = useCallback(async (id: string): Promise<MarketplaceListing> => {
    setLoading(true);
    try {
      return await marketplaceApi.getListing(id);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to load listing'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyListings = useCallback(async (status?: string): Promise<MarketplaceListing[]> => {
    return marketplaceApi.getMyListings(status);
  }, []);

  const updateListing = useCallback(async (id: string, input: UpdateListingInput): Promise<MarketplaceListing> => {
    setLoading(true);
    try {
      return await marketplaceApi.updateListing(id, input);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to update listing'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteListing = useCallback(async (id: string): Promise<void> => {
    return marketplaceApi.deleteListing(id);
  }, []);

  const createOrder = useCallback(async (input: { listingId: string; quantity?: number; shippingAddress?: object; notes?: string }): Promise<MarketplaceOrder> => {
    setLoading(true);
    try {
      return await marketplaceApi.createOrder(input);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to place order'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBuyingOrders = useCallback(async (status?: string): Promise<MarketplaceOrder[]> => {
    return marketplaceApi.getBuyingOrders(status);
  }, []);

  const getSellingOrders = useCallback(async (status?: string): Promise<MarketplaceOrder[]> => {
    return marketplaceApi.getSellingOrders(status);
  }, []);

  const makeOffer = useCallback(async (listingId: string, amount: number, message?: string) => {
    setLoading(true);
    try {
      return await marketplaceApi.makeOffer(listingId, { amount, message });
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Failed to make offer'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const createReview = useCallback(async (orderId: string, rating: number, comment?: string) => {
    return marketplaceApi.createReview(orderId, { rating, comment });
  }, []);

  const checkout = useCallback(async (input: {
    items: Array<{ listingId: string; quantity?: number }>;
    shippingAddress?: object;
    notes?: string;
    idempotencyKey?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      return await marketplaceApi.checkout(input);
    } catch (e: any) {
      setError(getApiErrorMessage(e, 'Checkout failed. Please retry.'));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createListing,
    publishListing,
    getListings,
    getListing,
    getMyListings,
    updateListing,
    deleteListing,
    createOrder,
    getBuyingOrders,
    getSellingOrders,
    makeOffer,
    createReview,
    checkout,
  };
}
