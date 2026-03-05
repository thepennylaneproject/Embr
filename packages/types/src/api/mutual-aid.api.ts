import { apiClient } from './base';
import type {
  MutualAidPost,
  MutualAidResponse,
  CreateMutualAidPostInput,
  UpdateMutualAidPostInput,
  MutualAidSearchParams,
  PaginatedMutualAidPosts,
} from '../mutual-aid.types';

export const mutualAidApi = {
  create: async (input: CreateMutualAidPostInput): Promise<MutualAidPost> => {
    const { data } = await apiClient.post('/mutual-aid', input);
    return data;
  },

  findAll: async (params?: MutualAidSearchParams): Promise<PaginatedMutualAidPosts> => {
    const { data } = await apiClient.get('/mutual-aid', { params });
    return data;
  },

  findOne: async (id: string): Promise<MutualAidPost> => {
    const { data } = await apiClient.get(`/mutual-aid/${id}`);
    return data;
  },

  update: async (id: string, input: UpdateMutualAidPostInput): Promise<MutualAidPost> => {
    const { data } = await apiClient.put(`/mutual-aid/${id}`, input);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/mutual-aid/${id}`);
  },

  markFulfilled: async (id: string): Promise<MutualAidPost> => {
    const { data } = await apiClient.post(`/mutual-aid/${id}/fulfill`);
    return data;
  },

  respond: async (postId: string, message: string): Promise<MutualAidResponse> => {
    const { data } = await apiClient.post(`/mutual-aid/${postId}/responses`, { message });
    return data;
  },

  acceptResponse: async (postId: string, responseId: string): Promise<MutualAidResponse> => {
    const { data } = await apiClient.put(`/mutual-aid/${postId}/responses/${responseId}/accept`);
    return data;
  },

  completeResponse: async (postId: string, responseId: string): Promise<void> => {
    await apiClient.put(`/mutual-aid/${postId}/responses/${responseId}/complete`);
  },

  declineResponse: async (postId: string, responseId: string): Promise<void> => {
    await apiClient.put(`/mutual-aid/${postId}/responses/${responseId}/decline`);
  },
};
