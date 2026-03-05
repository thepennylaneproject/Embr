export type GroupType = 'PUBLIC' | 'PRIVATE' | 'SECRET';
export type GroupMemberRole = 'MEMBER' | 'MODERATOR' | 'ADMIN';
export type GroupJoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type GroupInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface Group {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverUrl?: string;
  avatarUrl?: string;
  type: GroupType;
  category?: string;
  tags: string[];
  rules: string[];
  memberCount: number;
  postCount: number;
  isVerified: boolean;
  createdById: string;
  createdBy?: {
    id: string;
    username: string;
    profile?: { displayName: string; avatarUrl?: string };
  };
  createdAt: string;
  updatedAt: string;
  membershipRole?: GroupMemberRole | null;
  _count?: { members: number; posts: number };
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  joinedAt: string;
  user?: {
    id: string;
    username: string;
    profile?: { displayName: string; avatarUrl?: string };
  };
}

export interface GroupJoinRequest {
  id: string;
  groupId: string;
  userId: string;
  message?: string;
  status: GroupJoinRequestStatus;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    profile?: { displayName: string; avatarUrl?: string };
  };
}

export interface GroupInvite {
  id: string;
  groupId: string;
  inviterId: string;
  inviteeId: string;
  token: string;
  status: GroupInviteStatus;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateGroupInput {
  name: string;
  slug: string;
  description?: string;
  coverUrl?: string;
  avatarUrl?: string;
  type?: GroupType;
  category?: string;
  tags?: string[];
  rules?: string[];
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  coverUrl?: string;
  avatarUrl?: string;
  type?: GroupType;
  category?: string;
  tags?: string[];
  rules?: string[];
}

export interface GroupSearchParams {
  q?: string;
  type?: GroupType;
  category?: string;
  cursor?: string;
  limit?: number;
}

export interface PaginatedGroups {
  items: Group[];
  hasMore: boolean;
  nextCursor: string | null;
}
