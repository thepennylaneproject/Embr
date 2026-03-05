import { apiClient } from './base';
import type {
  Group,
  GroupMember,
  GroupJoinRequest,
  CreateGroupInput,
  UpdateGroupInput,
  GroupSearchParams,
  PaginatedGroups,
  GroupMemberRole,
} from '../groups.types';

export const groupsApi = {
  create: async (input: CreateGroupInput): Promise<Group> => {
    const { data } = await apiClient.post('/groups', input);
    return data;
  },

  findAll: async (params?: GroupSearchParams): Promise<PaginatedGroups> => {
    const { data } = await apiClient.get('/groups', { params });
    return data;
  },

  getMyGroups: async (): Promise<Group[]> => {
    const { data } = await apiClient.get('/groups/me');
    return data;
  },

  findBySlug: async (slug: string): Promise<Group> => {
    const { data } = await apiClient.get(`/groups/${slug}`);
    return data;
  },

  update: async (id: string, input: UpdateGroupInput): Promise<Group> => {
    const { data } = await apiClient.put(`/groups/${id}`, input);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/groups/${id}`);
  },

  // Members
  getMembers: async (groupId: string, cursor?: string, limit?: number): Promise<{ items: GroupMember[]; hasMore: boolean; nextCursor: string | null }> => {
    const { data } = await apiClient.get(`/groups/${groupId}/members`, { params: { cursor, limit } });
    return data;
  },

  join: async (groupId: string, message?: string): Promise<{ status: string }> => {
    const { data } = await apiClient.post(`/groups/${groupId}/members/join`, { message });
    return data;
  },

  leave: async (groupId: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post(`/groups/${groupId}/members/leave`);
    return data;
  },

  updateMemberRole: async (groupId: string, userId: string, role: GroupMemberRole): Promise<GroupMember> => {
    const { data } = await apiClient.put(`/groups/${groupId}/members/${userId}/role`, { role });
    return data;
  },

  removeMember: async (groupId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/groups/${groupId}/members/${userId}`);
  },

  getJoinRequests: async (groupId: string): Promise<GroupJoinRequest[]> => {
    const { data } = await apiClient.get(`/groups/${groupId}/members/join-requests`);
    return data;
  },

  approveJoinRequest: async (groupId: string, requestId: string): Promise<void> => {
    await apiClient.put(`/groups/${groupId}/members/join-requests/${requestId}/approve`);
  },

  rejectJoinRequest: async (groupId: string, requestId: string): Promise<void> => {
    await apiClient.put(`/groups/${groupId}/members/join-requests/${requestId}/reject`);
  },

  invite: async (groupId: string, userId: string): Promise<void> => {
    await apiClient.post(`/groups/${groupId}/members/invite`, { userId });
  },

  acceptInvite: async (token: string): Promise<{ groupId: string }> => {
    const { data } = await apiClient.post(`/groups/:groupId/members/invite/${token}/accept`);
    return data;
  },

  // Posts
  getPosts: async (groupId: string, cursor?: string, limit?: number) => {
    const { data } = await apiClient.get(`/groups/${groupId}/posts`, { params: { cursor, limit } });
    return data;
  },

  createPost: async (groupId: string, content: string, type?: string, mediaUrl?: string) => {
    const { data } = await apiClient.post(`/groups/${groupId}/posts`, { content, type, mediaUrl });
    return data;
  },
};
