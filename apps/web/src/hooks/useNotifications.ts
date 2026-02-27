import { useCallback, useEffect, useState } from 'react';
import { notificationsApi } from '@shared/api/notifications.api';
import type { Notification, NotificationsMeta } from '@shared/types/notifications.types';

interface UseNotificationsOptions {
  autoLoad?: boolean;
  unreadOnly?: boolean;
  limit?: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoLoad = true, unreadOnly = false, limit = 20 } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meta, setMeta] = useState<NotificationsMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchNotifications = useCallback(
    async (page = 1, append = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await notificationsApi.getNotifications({
          page,
          limit,
          unreadOnly,
        });

        // For the first page or when not appending, replace the list
        // For subsequent pages, append to the list
        if (append && page > 1) {
          setNotifications((prev) => [...prev, ...response.data]);
        } else {
          setNotifications(response.data);
        }

        setMeta(response.meta);
        setCurrentPage(page);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load notifications');
      } finally {
        setIsLoading(false);
      }
    },
    [limit, unreadOnly],
  );

  const loadMore = useCallback(() => {
    if (meta && currentPage < meta.totalPages && !isLoading) {
      fetchNotifications(currentPage + 1, true);
    }
  }, [meta, currentPage, isLoading, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { notification } = await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item)),
      );
      setMeta((prev) =>
        prev ? { ...prev, unreadCount: Math.max(0, prev.unreadCount - 1) } : prev,
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setMeta((prev) => (prev ? { ...prev, unreadCount: 0 } : prev));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark all as read');
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete notification');
    }
  }, []);

  const deleteAllRead = useCallback(async () => {
    try {
      await notificationsApi.deleteAllRead();
      setNotifications((prev) => prev.filter((item) => !item.isRead));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to clear read notifications');
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      fetchNotifications();
    }
  }, [autoLoad, fetchNotifications]);

  return {
    notifications,
    meta,
    isLoading,
    error,
    fetchNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  };
}
