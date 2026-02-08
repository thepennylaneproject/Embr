import { useMemo } from 'react';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationsPage() {
  const {
    notifications,
    meta,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  } = useNotifications({ autoLoad: true });

  const unreadCount = meta?.unreadCount ?? 0;
  const hasNotifications = notifications.length > 0;

  const formattedNotifications = useMemo(
    () =>
      notifications.map((notification) => ({
        ...notification,
        formattedDate: new Date(notification.createdAt).toLocaleString(),
      })),
    [notifications],
  );

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                  : 'You are all caught up.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => markAllAsRead()}
                disabled={unreadCount === 0}
                className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Mark all read
              </button>
              <button
                onClick={() => deleteAllRead()}
                disabled={!hasNotifications}
                className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Clear read
              </button>
            </div>
          </header>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="text-gray-500">Loading notifications...</p>
            </div>
          ) : !hasNotifications ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <p className="text-gray-500">No notifications yet.</p>
              <button
                onClick={() => fetchNotifications()}
                className="mt-3 text-sm text-[#E8998D] hover:underline"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {formattedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-2xl border p-4 ${
                    notification.isRead ? 'border-gray-200 bg-white' : 'border-[#E8998D]/40 bg-[#E8998D]/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {notification.title || notification.type}
                      </p>
                      {notification.message && (
                        <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-400">
                        {notification.formattedDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs font-medium text-[#E8998D] hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
