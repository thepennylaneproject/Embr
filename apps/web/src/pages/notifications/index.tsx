import { useMemo } from 'react';
import { ProtectedPageShell } from '@/components/layout';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@embr/ui';
import { copy } from '@/lib/copy';

export default function NotificationsPage() {
  const {
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
  } = useNotifications({ autoLoad: true });

  const unreadCount = meta?.unreadCount ?? 0;
  const hasNotifications = notifications.length > 0;
  const canLoadMore = meta && meta.page < meta.totalPages;

  const formattedNotifications = useMemo(
    () =>
      notifications.map((notification) => ({
        ...notification,
        formattedDate: new Date(notification.createdAt).toLocaleString(),
      })),
    [notifications],
  );

  return (
    <ProtectedPageShell
      title={copy.dashboard.notifications.title}
      subtitle={
        unreadCount > 0
          ? copy.dashboard.notifications.unread(unreadCount)
          : copy.dashboard.notifications.allCaughtUp
      }
      breadcrumbs={[{ label: copy.dashboard.notifications.title }]}
    >
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => markAllAsRead()}
          disabled={unreadCount === 0}
        >
          {copy.actions.markAllRead}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => deleteAllRead()}
          disabled={!hasNotifications}
        >
          {copy.actions.deleteAllRead}
        </Button>
      </div>

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          borderRadius: 'var(--embr-radius-lg)',
          border: '1px solid var(--embr-error)',
          backgroundColor: 'color-mix(in srgb, var(--embr-error) 15%, white)',
          fontSize: '0.9rem',
          color: 'var(--embr-error)',
        }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="ui-card" data-padding="lg">
          <p style={{ color: 'var(--embr-muted-text)' }}>{copy.actions.loading}...</p>
        </div>
      ) : !hasNotifications ? (
        <div className="ui-card" data-padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--embr-muted-text)' }}>{copy.emptyStates.noNotifications}</p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => fetchNotifications()}
            style={{ marginTop: '0.75rem' }}
          >
            {copy.actions.refresh}
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {formattedNotifications.map((notification) => (
            <div
              key={notification.id}
              className="ui-card"
              data-padding="md"
              style={{
                backgroundColor: notification.isRead
                  ? 'var(--embr-surface)'
                  : 'color-mix(in srgb, var(--embr-accent) 12%, white)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.95rem', fontWeight: '600' }}>
                    {notification.title || notification.type}
                  </p>
                  {notification.message && (
                    <p style={{ marginTop: '0.25rem', fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>
                      {notification.message}
                    </p>
                  )}
                  <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--embr-muted-text)' }}>
                    {notification.formattedDate}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!notification.isRead && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: 'var(--embr-accent)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: 'var(--embr-muted-text)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {canLoadMore && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={loadMore}
                disabled={isLoading}
              >
                {isLoading ? `${copy.actions.loading}...` : copy.actions.loadMore}
              </Button>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div
              style={{
                marginTop: '1rem',
                textAlign: 'center',
                fontSize: '0.85rem',
                color: 'var(--embr-muted-text)',
              }}
            >
              Page {meta.page} of {meta.totalPages}
            </div>
          )}
        </div>
      )}
    </ProtectedPageShell>
  );
}
