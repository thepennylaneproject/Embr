export interface Notification {
  id: string;
  type: string;
  title?: string | null;
  message?: string | null;
  actorId?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  unreadCount: number;
}

export interface NotificationsResponse {
  data: Notification[];
  meta: NotificationsMeta;
}
