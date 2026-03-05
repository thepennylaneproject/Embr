export type MutualAidType = 'REQUEST' | 'OFFER';
export type MutualAidCategory =
  | 'FOOD'
  | 'SHELTER'
  | 'TRANSPORTATION'
  | 'CHILDCARE'
  | 'MEDICAL'
  | 'FINANCIAL'
  | 'SKILLS'
  | 'SUPPLIES'
  | 'EMOTIONAL_SUPPORT'
  | 'OTHER';
export type MutualAidUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MutualAidStatus = 'OPEN' | 'IN_PROGRESS' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
export type MutualAidResponseStatus = 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED';

export interface MutualAidPost {
  id: string;
  authorId: string;
  author?: { id: string; username: string; profile?: { displayName: string; avatarUrl?: string } };
  type: MutualAidType;
  category: MutualAidCategory;
  title: string;
  description: string;
  quantity?: string;
  location?: string;
  isRemote: boolean;
  urgency: MutualAidUrgency;
  status: MutualAidStatus;
  expiresAt?: string;
  tags: string[];
  groupId?: string;
  group?: { id: string; name: string; slug: string };
  responseCount: number;
  responses?: MutualAidResponse[];
  _count?: { responses: number };
  createdAt: string;
  updatedAt: string;
}

export interface MutualAidResponse {
  id: string;
  postId: string;
  responderId: string;
  responder?: { id: string; username: string; profile?: { displayName: string; avatarUrl?: string } };
  message: string;
  status: MutualAidResponseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMutualAidPostInput {
  type: MutualAidType;
  category: MutualAidCategory;
  title: string;
  description: string;
  quantity?: string;
  location?: string;
  isRemote?: boolean;
  urgency?: MutualAidUrgency;
  expiresAt?: string;
  tags?: string[];
  groupId?: string;
}

export interface UpdateMutualAidPostInput {
  title?: string;
  description?: string;
  quantity?: string;
  location?: string;
  isRemote?: boolean;
  urgency?: MutualAidUrgency;
  expiresAt?: string;
  tags?: string[];
}

export interface MutualAidSearchParams {
  q?: string;
  type?: MutualAidType;
  category?: MutualAidCategory;
  urgency?: MutualAidUrgency;
  groupId?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedMutualAidPosts {
  items: MutualAidPost[];
  hasMore: boolean;
  nextCursor: string | null;
}

export const MUTUAL_AID_CATEGORY_LABELS: Record<MutualAidCategory, string> = {
  FOOD: 'Food & Meals',
  SHELTER: 'Shelter & Housing',
  TRANSPORTATION: 'Transportation',
  CHILDCARE: 'Childcare',
  MEDICAL: 'Medical & Health',
  FINANCIAL: 'Financial Support',
  SKILLS: 'Skills & Labor',
  SUPPLIES: 'Supplies & Goods',
  EMOTIONAL_SUPPORT: 'Emotional Support',
  OTHER: 'Other',
};

export const MUTUAL_AID_CATEGORY_ICONS: Record<MutualAidCategory, string> = {
  FOOD: '🥘',
  SHELTER: '🏠',
  TRANSPORTATION: '🚗',
  CHILDCARE: '👶',
  MEDICAL: '🏥',
  FINANCIAL: '💰',
  SKILLS: '🛠️',
  SUPPLIES: '📦',
  EMOTIONAL_SUPPORT: '💙',
  OTHER: '🤝',
};
