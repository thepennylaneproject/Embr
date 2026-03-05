export type ListingType = 'PHYSICAL' | 'DIGITAL' | 'BUNDLE';
export type ListingCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'SOLD' | 'RESERVED' | 'CANCELLED' | 'EXPIRED';
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'CANCELLED';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COUNTERED' | 'EXPIRED' | 'WITHDRAWN';

export interface SellerProfile {
  id: string;
  username: string;
  profile?: { displayName: string; avatarUrl?: string; bio?: string };
}

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  seller?: SellerProfile;
  title: string;
  description: string;
  price: number;
  type: ListingType;
  condition?: ListingCondition;
  category: string;
  tags: string[];
  images: string[];
  status: ListingStatus;
  quantity: number;
  allowOffers: boolean;
  isShippable: boolean;
  shippingCost?: number;
  location?: string;
  viewCount: number;
  groupId?: string;
  group?: { id: string; name: string; slug: string };
  reviews?: MarketplaceReview[];
  _count?: { orders: number; reviews: number };
  avgRating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceOrder {
  id: string;
  listingId: string;
  listing?: { id: string; title: string; images: string[] };
  buyerId: string;
  buyer?: { id: string; username: string; profile?: { displayName: string; avatarUrl?: string } };
  sellerId: string;
  seller?: { id: string; username: string; profile?: { displayName: string; avatarUrl?: string } };
  quantity: number;
  subtotal: number;
  shippingCost: number;
  platformFee: number;
  totalAmount: number;
  status: OrderStatus;
  shippingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  notes?: string;
  review?: MarketplaceReview;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceReview {
  id: string;
  orderId: string;
  listingId: string;
  reviewerId: string;
  reviewer?: { id: string; username: string; profile?: { displayName: string; avatarUrl?: string } };
  sellerId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface MarketplaceOffer {
  id: string;
  listingId: string;
  buyerId: string;
  buyer?: { id: string; username: string; profile?: { displayName: string; avatarUrl?: string } };
  amount: number;
  message?: string;
  status: OfferStatus;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  price: number;
  type: ListingType;
  condition?: ListingCondition;
  category: string;
  tags?: string[];
  images?: string[];
  quantity?: number;
  allowOffers?: boolean;
  isShippable?: boolean;
  shippingCost?: number;
  location?: string;
  groupId?: string;
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number;
  condition?: ListingCondition;
  category?: string;
  tags?: string[];
  images?: string[];
  quantity?: number;
  allowOffers?: boolean;
  isShippable?: boolean;
  shippingCost?: number;
  location?: string;
}

export interface ListingSearchParams {
  q?: string;
  type?: ListingType;
  category?: string;
  condition?: ListingCondition;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  groupId?: string;
  sellerId?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedListings {
  items: MarketplaceListing[];
  hasMore: boolean;
  nextCursor: string | null;
}

export const LISTING_CATEGORIES = [
  'Electronics',
  'Clothing & Apparel',
  'Books & Media',
  'Art & Collectibles',
  'Musical Instruments',
  'Sports & Outdoors',
  'Home & Garden',
  'Toys & Games',
  'Health & Beauty',
  'Food & Drink',
  'Handmade & Crafts',
  'Digital Downloads',
  'Tickets & Events',
  'Services',
  'Other',
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export const LISTING_CONDITION_LABELS: Record<ListingCondition, string> = {
  NEW: 'New',
  LIKE_NEW: 'Like New',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
};
