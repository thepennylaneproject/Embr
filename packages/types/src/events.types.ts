export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
export type EventType = 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';
export type PricingType = 'FREE' | 'FIXED' | 'SLIDING_SCALE' | 'PAY_WHAT_YOU_CAN';
export type RsvpStatus = 'GOING' | 'MAYBE' | 'NOT_GOING';

export interface EventHost {
  id: string;
  username: string;
  profile?: { displayName: string; avatarUrl?: string; bio?: string };
}

export interface EventGroup {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
}

export interface EventLinkedMutualAid {
  id: string;
  title: string;
  type: string;
  category: string;
}

export interface Event {
  id: string;
  hostId: string;
  host?: EventHost;
  groupId?: string;
  group?: EventGroup;
  title: string;
  description: string;
  eventType: EventType;
  coverUrl?: string;
  location?: string;
  virtualLink?: string;
  startAt: string;
  endAt: string;
  timezone: string;
  maxAttendees?: number;
  isTicketed: boolean;
  pricingType: PricingType;
  minPrice?: number;
  suggestedPrice?: number;
  status: EventStatus;
  tags: string[];
  linkedMutualAidId?: string;
  linkedMutualAid?: EventLinkedMutualAid;
  recap?: EventRecap;
  myRsvp?: EventAttendee | null;
  _count?: { attendees: number };
  createdAt: string;
  updatedAt: string;
}

export interface EventAttendee {
  id: string;
  eventId: string;
  userId: string;
  user?: { id: string; username: string; profile?: { displayName: string; avatarUrl?: string } };
  status: RsvpStatus;
  amountPaid?: number;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRecap {
  id: string;
  eventId: string;
  postId?: string;
  post?: { id: string; content?: string; createdAt: string };
  notes?: string;
  mediaUrls: string[];
  createdAt: string;
}

export interface CreateEventInput {
  title: string;
  description: string;
  eventType: EventType;
  startAt: string;
  endAt: string;
  timezone?: string;
  location?: string;
  virtualLink?: string;
  coverUrl?: string;
  maxAttendees?: number;
  isTicketed?: boolean;
  pricingType?: PricingType;
  minPrice?: number;
  suggestedPrice?: number;
  tags?: string[];
  groupId?: string;
  linkedMutualAidId?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  eventType?: EventType;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  location?: string;
  virtualLink?: string;
  coverUrl?: string;
  maxAttendees?: number;
  isTicketed?: boolean;
  pricingType?: PricingType;
  minPrice?: number;
  suggestedPrice?: number;
  tags?: string[];
}

export interface RsvpInput {
  status: RsvpStatus;
  amountPaid?: number;
  stripePaymentIntentId?: string;
}

export interface CreateEventRecapInput {
  notes?: string;
  mediaUrls?: string[];
}

export interface EventSearchParams {
  q?: string;
  eventType?: EventType;
  groupId?: string;
  hostId?: string;
  from?: string;
  to?: string;
  upcoming?: boolean;
  cursor?: string;
  limit?: number;
}

export interface PaginatedEvents {
  items: Event[];
  hasMore: boolean;
  nextCursor: string | null;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  IN_PERSON: 'In Person',
  VIRTUAL: 'Virtual',
  HYBRID: 'Hybrid',
};

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  IN_PERSON: '📍',
  VIRTUAL: '💻',
  HYBRID: '🌐',
};

export const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  FREE: 'Free',
  FIXED: 'Fixed Price',
  SLIDING_SCALE: 'Sliding Scale',
  PAY_WHAT_YOU_CAN: 'Pay What You Can',
};
