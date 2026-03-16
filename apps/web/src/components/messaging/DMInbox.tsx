/**
 * DMInbox Component
 * Main inbox view with conversation list and message thread
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { ConversationPreview, MessageType } from '@shared/types/messaging.types';
import { messagingAPI } from '@shared/api/messaging.api';
import { useUserSearch } from '@/hooks/useUserSearch';

interface DMInboxProps {
  className?: string;
  initialConversationId?: string;
  onConversationSelect?: (conversationId: string) => void;
}

export const DMInbox: React.FC<DMInboxProps> = ({
  className = '',
  initialConversationId,
  onConversationSelect,
}) => {
  // Stable callback references so useMessaging's connection effect doesn't re-run
  const handleMessage = useCallback((_message: any, _conversation: any) => {
    // new message notification handling
  }, []);

  const handleMessageRead = useCallback((_data: any) => {
    // mark-as-read callback
  }, []);

  const handleTypingIndicator = useCallback((_indicator: any) => {
    // typing indicator update
  }, []);

  const {
    conversations,
    messages,
    unreadCount,
    loading,
    error,
    isConnected,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
    sendTypingIndicator,
    getTypingUsers,
    uploadMedia,
  } = useMessaging({
    autoConnect: true,
    onMessage: handleMessage,
    onMessageRead: handleMessageRead,
    onTypingIndicator: handleTypingIndicator,
  });

  const [selectedConversation, setSelectedConversation] =
    useState<ConversationPreview | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSearch, setComposeSearch] = useState('');
  const [composeLoading, setComposeLoading] = useState(false);
  const { users: userResults, searchUsers, reset: resetUserSearch } = useUserSearch();

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleConversationSelect = useCallback(async (conversation: ConversationPreview) => {
    setSelectedConversation(conversation);
    onConversationSelect?.(conversation.id);

    // Mark conversation as read
    if (conversation.unreadCount > 0) {
      markAsRead({ conversationId: conversation.id });
    }

    if (!messages[conversation.id]) {
      await fetchMessages({ conversationId: conversation.id, page: 1, limit: 30 });
    }
  }, [fetchMessages, markAsRead, messages, onConversationSelect]);

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  const handleComposeOpen = () => {
    resetUserSearch();
    setComposeSearch('');
    setComposeOpen(true);
  };

  const handleComposeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setComposeSearch(q);
    if (q.trim()) {
      searchUsers({ query: q }, true);
    } else {
      resetUserSearch();
    }
  };

  const handleStartConversation = async (userId: string) => {
    setComposeLoading(true);
    try {
      const conv = await messagingAPI.createConversation({ participantId: userId });
      setComposeOpen(false);
      await fetchConversations();
      const convId = conv.conversation.id;
      const fresh = conversations.find((c) => c.id === convId) ?? ({
        id: convId,
        otherUser: (conv.conversation as unknown as { otherUser: ConversationPreview['otherUser'] }).otherUser,
        unreadCount: 0,
        lastMessage: null,
        lastMessageAt: new Date().toISOString(),
      } as ConversationPreview);
      handleConversationSelect(fresh);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    } finally {
      setComposeLoading(false);
    }
  };

  useEffect(() => {
    if (!initialConversationId || conversations.length === 0) return;

    const existing = conversations.find((conv) => conv.id === initialConversationId);
    if (existing) {
      handleConversationSelect(existing);
    }
  }, [initialConversationId, conversations, handleConversationSelect]);

  const handleSendMessage = async (content: string, mediaFile?: File) => {
    if (!selectedConversation) return;

    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;

      // Upload media if present
      if (mediaFile) {
        const uploadResult = await uploadMedia(
          mediaFile,
          selectedConversation.id,
          mediaFile.type.startsWith('image/')
            ? MessageType.IMAGE
            : mediaFile.type.startsWith('video/')
            ? MessageType.VIDEO
            : MessageType.FILE,
        );
        mediaUrl = uploadResult.url;
        mediaType = uploadResult.mediaType;
      }

      // Send message
      await sendMessage({
        conversationId: selectedConversation.id,
        content,
        mediaUrl,
        mediaType,
        type: mediaFile
          ? mediaFile.type.startsWith('image/')
            ? MessageType.IMAGE
            : MessageType.VIDEO
          : MessageType.TEXT,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Mobile view: show either list or thread
  if (isMobileView) {
    if (selectedConversation) {
      return (
        <div className={`h-full flex flex-col ${className}`}>
          <MessageThread
            conversation={selectedConversation}
            messages={messages[selectedConversation.id] || []}
            typingUsers={getTypingUsers(selectedConversation.id)}
            isConnected={isConnected}
            onSendMessage={handleSendMessage}
            onTyping={(isTyping) =>
              sendTypingIndicator(selectedConversation.id, isTyping)
            }
            onBack={handleBackToList}
          />
        </div>
      );
    }

    return (
      <div className={`h-full flex flex-col ${className}`}>
        {/* Mobile compose button */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--embr-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleComposeOpen}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)',
              background: 'var(--embr-accent)', color: '#fff',
              fontSize: '0.875rem', fontWeight: '600', border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            New Message
          </button>
        </div>
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversation ? (selectedConversation as ConversationPreview).id : undefined}
          unreadCount={unreadCount}
          searchQuery={searchQuery}
          loading={loading}
          error={error}
          isConnected={isConnected}
          onConversationSelect={handleConversationSelect}
          onSearchChange={setSearchQuery}
        />
        {composeOpen && <ComposeModal
          search={composeSearch}
          users={userResults}
          loading={composeLoading}
          onSearchChange={handleComposeSearch}
          onSelect={handleStartConversation}
          onClose={() => setComposeOpen(false)}
        />}
      </div>
    );
  }

  // Desktop view: show both list and thread side by side
  return (
    <div className={`h-full flex ${className}`} style={{ position: 'relative' }}>
      {/* Conversation List - Left sidebar */}
      <div className="w-96 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Compose button header */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--embr-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: '600', fontSize: '1rem' }}>Messages</span>
          <button
            onClick={handleComposeOpen}
            title="New Message"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 0.9rem', borderRadius: 'var(--embr-radius-md)',
              background: 'var(--embr-accent)', color: '#fff',
              fontSize: '0.8rem', fontWeight: '600', border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            New
          </button>
        </div>
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversation ? (selectedConversation as ConversationPreview).id : undefined}
          unreadCount={unreadCount}
          searchQuery={searchQuery}
          loading={loading}
          error={error}
          isConnected={isConnected}
          onConversationSelect={handleConversationSelect}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Message Thread - Main content */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <MessageThread
            conversation={selectedConversation}
            messages={messages[selectedConversation.id] || []}
            typingUsers={getTypingUsers(selectedConversation.id)}
            isConnected={isConnected}
            onSendMessage={handleSendMessage}
            onTyping={(isTyping) =>
              sendTypingIndicator(selectedConversation.id, isTyping)
            }
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Select a conversation
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Choose a conversation from the list, or start a new one
              </p>
              <button
                onClick={handleComposeOpen}
                style={{
                  marginTop: '1rem', padding: '0.5rem 1.2rem',
                  borderRadius: 'var(--embr-radius-md)',
                  background: 'var(--embr-accent)', color: '#fff',
                  fontSize: '0.875rem', fontWeight: '600',
                  border: 'none', cursor: 'pointer',
                }}
              >
                New Message
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {composeOpen && <ComposeModal
        search={composeSearch}
        users={userResults}
        loading={composeLoading}
        onSearchChange={handleComposeSearch}
        onSelect={handleStartConversation}
        onClose={() => setComposeOpen(false)}
      />}
    </div>
  );
};

// -------------------------------------------------------
// Compose Modal
// -------------------------------------------------------
interface ComposeModalProps {
  search: string;
  users: any[];
  loading: boolean;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelect: (userId: string) => void;
  onClose: () => void;
}

const ComposeModal: React.FC<ComposeModalProps> = ({ search, users, loading, onSearchChange, onSelect, onClose }) => (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div style={{
      background: 'var(--embr-card-bg, #fff)', borderRadius: 'var(--embr-radius-lg)',
      width: '100%', maxWidth: '420px', padding: '1.5rem',
      boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>New Message</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
      </div>
      <input
        type="text"
        value={search}
        onChange={onSearchChange}
        placeholder="Search by name or username..."
        autoFocus
        style={{
          width: '100%', padding: '0.6rem 0.9rem',
          border: '1px solid var(--embr-border)',
          borderRadius: 'var(--embr-radius-md)',
          fontSize: '0.9rem', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ marginTop: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
        {loading && <p style={{ padding: '0.75rem', color: 'var(--embr-muted-text)', textAlign: 'center' }}>Searching...</p>}
        {!loading && search && users.length === 0 && (
          <p style={{ padding: '0.75rem', color: 'var(--embr-muted-text)', textAlign: 'center' }}>No users found</p>
        )}
        {!search && !loading && (
          <p style={{ padding: '0.75rem', color: 'var(--embr-muted-text)', textAlign: 'center' }}>Type to search for a user</p>
        )}
        {users.map((u: any) => (
          <button
            key={u.id}
            onClick={() => onSelect(u.id)}
            style={{
              width: '100%', textAlign: 'left', padding: '0.6rem 0.5rem',
              borderRadius: 'var(--embr-radius-md)', border: 'none',
              background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--embr-hover-bg, #f5f5f5)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
          >
            {u.profile?.avatarUrl ? (
              <img src={u.profile.avatarUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--embr-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '0.85rem' }}>
                {(u.profile?.displayName || u.username || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{u.profile?.displayName || u.username}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--embr-muted-text)' }}>@{u.username}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
);
