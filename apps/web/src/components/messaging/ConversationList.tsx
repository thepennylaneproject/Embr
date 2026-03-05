/**
 * ConversationList Component
 * Displays list of conversations with search and unread indicators
 */

import React from 'react';
import { ConversationPreview, MessageType } from '@shared/types/messaging.types';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  conversations: ConversationPreview[];
  selectedConversationId?: string;
  unreadCount: number;
  searchQuery: string;
  loading: boolean;
  error: Error | null;
  isConnected: boolean;
  onConversationSelect: (conversation: ConversationPreview) => void;
  onSearchChange: (query: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  unreadCount,
  searchQuery,
  loading,
  error,
  isConnected,
  onConversationSelect,
  onSearchChange,
}) => {
  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser.profile.displayName
      .toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
    conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getMessagePreview = (conversation: ConversationPreview): string => {
    if (!conversation.lastMessage) return 'No messages yet';
    const { content, type } = conversation.lastMessage;
    switch (type) {
      case MessageType.IMAGE: return '📷 Photo';
      case MessageType.VIDEO: return '🎥 Video';
      case MessageType.FILE:  return '📎 File';
      default: return content || '';
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--embr-bg)' }}>
      {/* Search */}
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--embr-border)' }}>
        <div style={{ position: 'relative' }}>
          <svg
            style={{
              position: 'absolute', left: '0.65rem', top: '50%',
              transform: 'translateY(-50%)', width: '16px', height: '16px',
              color: 'var(--embr-muted-text)', pointerEvents: 'none',
            }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations…"
            className="ui-field"
            style={{ width: '100%', paddingLeft: '2.1rem', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--embr-border)',
          background: 'color-mix(in srgb, var(--embr-error) 8%, white)',
          fontSize: '0.85rem',
          color: 'var(--embr-error)',
        }}>
          {error.message}
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && conversations.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '8rem' }}>
            <div style={{
              width: '28px', height: '28px',
              border: '2px solid var(--embr-border)',
              borderTopColor: 'var(--embr-accent)',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '8rem', textAlign: 'center', padding: '1rem',
          }}>
            <svg style={{ width: '40px', height: '40px', color: 'var(--embr-neutral-300)', marginBottom: '0.5rem' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p style={{ fontSize: '0.875rem', color: 'var(--embr-muted-text)' }}>
              {searchQuery ? 'No conversations found' : 'No messages yet. Start a conversation!'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const isSelected = conversation.id === selectedConversationId;
            const hasUnread = conversation.unreadCount > 0;

            return (
              <button
                key={conversation.id}
                onClick={() => onConversationSelect(conversation)}
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  border: 'none',
                  borderBottom: '1px solid var(--embr-border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: isSelected
                    ? 'color-mix(in srgb, var(--embr-accent) 10%, white)'
                    : 'transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--embr-surface)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {/* Avatar */}
                <div style={{ flexShrink: 0 }}>
                  {conversation.otherUser.profile.avatarUrl ? (
                    <img
                      src={conversation.otherUser.profile.avatarUrl}
                      alt={conversation.otherUser.profile.displayName}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: 'var(--embr-neutral-300)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ color: '#fff', fontWeight: '700', fontSize: '1rem' }}>
                        {conversation.otherUser.profile.displayName[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: hasUnread ? '700' : '600',
                        color: 'var(--embr-text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {conversation.otherUser.profile.displayName}
                      </span>
                      {conversation.otherUser.profile.isVerified && (
                        <svg style={{ width: '14px', height: '14px', color: 'var(--embr-accent)', flexShrink: 0 }}
                          fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd"
                            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)', flexShrink: 0 }}>
                      {formatTimestamp(conversation.lastMessageAt)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{
                      fontSize: '0.825rem',
                      color: hasUnread ? 'var(--embr-text)' : 'var(--embr-muted-text)',
                      fontWeight: hasUnread ? '500' : '400',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {getMessagePreview(conversation)}
                    </p>
                    {hasUnread && (
                      <span style={{
                        marginLeft: '0.5rem',
                        minWidth: '20px', height: '20px',
                        borderRadius: '10px',
                        background: 'var(--embr-accent)',
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 5px',
                        flexShrink: 0,
                      }}>
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Connection dot */}
      <div style={{
        padding: '0.5rem 1rem',
        borderTop: '1px solid var(--embr-border)',
        display: 'flex', alignItems: 'center', gap: '0.4rem',
      }}>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: isConnected ? '#4caf50' : 'var(--embr-neutral-300)',
        }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>
          {isConnected ? 'Connected' : 'Reconnecting…'}
        </span>
        {unreadCount > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>
            {unreadCount} unread
          </span>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
