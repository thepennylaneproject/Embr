import { apiClient } from '@/lib/api/client';
import type { NotificationsResponse, Notification } from '@shared/types/notifications.types';

export const notificationsApi = {
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsResponse> => {
    const { data } = await apiClient.get('/notifications', { params });
    return data;
  },

  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const { data } = await apiClient.get('/notifications/count');
    return data;
  },

  markAsRead: async (notificationId: string): Promise<{ notification: Notification }> => {
    const { data } = await apiClient.patch(`/notifications/${notificationId}/read`);
    return data;
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    const { data } = await apiClient.patch('/notifications/read-all');
    return data;
  },

  deleteNotification: async (notificationId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/notifications/${notificationId}`);
    return data;
  },

  deleteAllRead: async (): Promise<{ count: number }> => {
    const { data } = await apiClient.delete('/notifications/read');
    return data;
  },
};
