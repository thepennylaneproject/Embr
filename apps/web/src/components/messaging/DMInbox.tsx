/**
 * DMInbox Component
 * Main inbox view with conversation list and message thread
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { ConversationPreview, MessageType } from '@shared/types/messaging.types';

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
    onMessage: (message, conversation) => {
      console.log('New message received:', message);
      // Handle new message notification
    },
    onMessageRead: (data) => {
      console.log('Message read:', data);
    },
    onTypingIndicator: (indicator) => {
      console.log('Typing indicator:', indicator);
    },
  });

  const [selectedConversation, setSelectedConversation] =
    useState<ConversationPreview | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);

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
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversation?.id}
          unreadCount={unreadCount}
          searchQuery={searchQuery}
          loading={loading}
          error={error}
          isConnected={isConnected}
          onConversationSelect={handleConversationSelect}
          onSearchChange={setSearchQuery}
        />
      </div>
    );
  }

  // Desktop view: show both list and thread side by side
  return (
    <div className={`h-full flex ${className}`}>
      {/* Conversation List - Left sidebar */}
      <div className="w-96 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversation?.id}
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
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
