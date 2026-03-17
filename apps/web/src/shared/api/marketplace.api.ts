import { apiClient } from '@/lib/api/client';
import type {
  MarketplaceListing,
  MarketplaceOrder,
  MarketplaceReview,
  MarketplaceOffer,
  CreateListingInput,
  UpdateListingInput,
  ListingSearchParams,
  PaginatedListings,
} from '@embr/types';

export const marketplaceApi = {
  // Listings
  createListing: async (input: CreateListingInput): Promise<MarketplaceListing> => {
    const { data } = await apiClient.post('/marketplace/listings', input);
    return data;
  },

  publishListing: async (id: string): Promise<MarketplaceListing> => {
    const { data } = await apiClient.post(`/marketplace/listings/${id}/publish`);
    return data;
  },

  getListings: async (params?: ListingSearchParams): Promise<PaginatedListings> => {
    const { data } = await apiClient.get('/marketplace/listings', { params });
    return data;
  },

  getMyListings: async (status?: string): Promise<MarketplaceListing[]> => {
    const { data } = await apiClient.get('/marketplace/listings/mine', { params: { status } });
    return data;
  },

  getListing: async (id: string): Promise<MarketplaceListing> => {
    const { data } = await apiClient.get(`/marketplace/listings/${id}`);
    return data;
  },

  updateListing: async (id: string, input: UpdateListingInput): Promise<MarketplaceListing> => {
    const { data } = await apiClient.put(`/marketplace/listings/${id}`, input);
    return data;
  },

  deleteListing: async (id: string): Promise<void> => {
    await apiClient.delete(`/marketplace/listings/${id}`);
  },

  // Orders
  createOrder: async (input: {
    listingId: string;
    quantity?: number;
    shippingAddress?: object;
    notes?: string;
  }): Promise<MarketplaceOrder> => {
    const { data } = await apiClient.post('/marketplace/orders', input);
    return data;
  },

  checkout: async (input: {
    items: Array<{ listingId: string; quantity?: number }>;
    shippingAddress?: object;
    notes?: string;
    idempotencyKey?: string;
  }): Promise<{
    checkoutId: string;
    status: 'confirmed';
    idempotentReplay: boolean;
    orderCount: number;
    totalAmount: number;
    orders: MarketplaceOrder[];
  }> => {
    const { data } = await apiClient.post('/marketplace/orders/checkout', input);
    return data;
  },

  getBuyingOrders: async (status?: string): Promise<MarketplaceOrder[]> => {
    const { data } = await apiClient.get('/marketplace/orders/buying', { params: { status } });
    return data;
  },

  getSellingOrders: async (status?: string): Promise<MarketplaceOrder[]> => {
    const { data } = await apiClient.get('/marketplace/orders/selling', { params: { status } });
    return data;
  },

  confirmPayment: async (orderId: string): Promise<MarketplaceOrder> => {
    const { data } = await apiClient.put(`/marketplace/orders/${orderId}/pay`);
    return data;
  },

  markShipped: async (orderId: string, trackingNumber: string): Promise<MarketplaceOrder> => {
    const { data } = await apiClient.put(`/marketplace/orders/${orderId}/ship`, { trackingNumber });
    return data;
  },

  markDelivered: async (orderId: string): Promise<MarketplaceOrder> => {
    const { data } = await apiClient.put(`/marketplace/orders/${orderId}/deliver`);
    return data;
  },

  completeOrder: async (orderId: string): Promise<MarketplaceOrder> => {
    const { data } = await apiClient.put(`/marketplace/orders/${orderId}/complete`);
    return data;
  },

  // Reviews
  createReview: async (orderId: string, input: { rating: number; comment?: string }): Promise<MarketplaceReview> => {
    const { data } = await apiClient.post(`/marketplace/orders/${orderId}/review`, input);
    return data;
  },

  getListingReviews: async (listingId: string): Promise<MarketplaceReview[]> => {
    const { data } = await apiClient.get(`/marketplace/listings/${listingId}/reviews`);
    return data;
  },

  getSellerReviews: async (
    sellerId: string,
  ): Promise<{ reviews: MarketplaceReview[]; avgRating: number | null; totalReviews: number }> => {
    const { data } = await apiClient.get(`/marketplace/sellers/${sellerId}/reviews`);
    return data;
  },

  // Offers
  makeOffer: async (listingId: string, input: { amount: number; message?: string }): Promise<MarketplaceOffer> => {
    const { data } = await apiClient.post(`/marketplace/listings/${listingId}/offers`, input);
    return data;
  },

  getListingOffers: async (listingId: string): Promise<MarketplaceOffer[]> => {
    const { data } = await apiClient.get(`/marketplace/listings/${listingId}/offers`);
    return data;
  },

  acceptOffer: async (listingId: string, offerId: string): Promise<void> => {
    await apiClient.put(`/marketplace/listings/${listingId}/offers/${offerId}/accept`);
  },

  declineOffer: async (listingId: string, offerId: string): Promise<void> => {
    await apiClient.put(`/marketplace/listings/${listingId}/offers/${offerId}/decline`);
  },

  withdrawOffer: async (listingId: string, offerId: string): Promise<void> => {
    await apiClient.put(`/marketplace/listings/${listingId}/offers/${offerId}/withdraw`);
  },
};
