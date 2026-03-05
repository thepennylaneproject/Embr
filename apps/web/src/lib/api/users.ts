import apiClient from './client';

export interface UpdateSettingsPayload {
  isCreator?: boolean;
  isPrivate?: boolean;
  allowTips?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  notificationPreference?: 'all' | 'mentions' | 'none';
}

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  website?: string;
  location?: string;
  socialLinks?: string[];
}

export const usersApi = {
  updateSettings: async (payload: UpdateSettingsPayload) => {
    const { data } = await apiClient.patch('/users/settings', payload);
    return data;
  },

  updateProfile: async (payload: UpdateProfilePayload) => {
    const { data } = await apiClient.patch('/users/profile', payload);
    return data;
  },

  updateAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const { data } = await apiClient.patch('/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  deleteAccount: async () => {
    const { data } = await apiClient.delete('/users/account');
    return data;
  },
};

export default usersApi;
