/**
 * MessageThread Component
 * Displays messages in a conversation with typing indicators and message input
 */

import React, { useState, useRef, useEffect } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import {
  ConversationPreview,
  MessageWithSender,
  TypingIndicator,
  MessageType,
} from '@shared/types/messaging.types';
import { MessageInput } from './MessageInput';

interface MessageThreadProps {
  conversation: ConversationPreview;
  messages: MessageWithSender[];
  typingUsers: TypingIndicator[];
  isConnected: boolean;
  onSendMessage: (content: string, file?: File) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  onBack?: () => void;
}

const Avatar: React.FC<{ url?: string; name: string; size?: number }> = ({ url, name, size = 36 }) => (
  url ? (
    <img
      src={url}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--embr-neutral-300)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: '700', fontSize: `${size * 0.36}px`,
    }}>
      {name[0].toUpperCase()}
    </div>
  )
);

export const MessageThread: React.FC<MessageThreadProps> = ({
  conversation,
  messages,
  typingUsers,
  isConnected,
  onSendMessage,
  onTyping,
  onBack,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [_isLoadingMore, _setIsLoadingMore] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatMessageTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const formatDateDivider = (dateString: string): string => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const renderMessage = (message: MessageWithSender, isOwnMessage: boolean) => (
    <div
      key={message.id}
      style={{
        display: 'flex',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        marginBottom: '0.75rem',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: '0.5rem',
        maxWidth: '70%',
      }}>
        {/* Avatar — other user only */}
        {!isOwnMessage && (
          <Avatar
            url={conversation.otherUser.profile.avatarUrl}
            name={conversation.otherUser.profile.displayName}
            size={30}
          />
        )}

        {/* Bubble */}
        <div>
          <div style={{
            borderRadius: isOwnMessage
              ? 'var(--embr-radius-lg) var(--embr-radius-lg) var(--embr-radius-sm) var(--embr-radius-lg)'
              : 'var(--embr-radius-lg) var(--embr-radius-lg) var(--embr-radius-lg) var(--embr-radius-sm)',
            padding: '0.6rem 0.9rem',
            background: isOwnMessage ? 'var(--embr-accent)' : 'var(--embr-surface)',
            border: isOwnMessage ? 'none' : '1px solid var(--embr-border)',
            color: isOwnMessage ? '#fff' : 'var(--embr-text)',
          }}>
            {/* Media */}
            {message.type === MessageType.IMAGE && message.mediaUrl && (
              <img
                src={message.mediaUrl}
                alt="Shared image"
                style={{ borderRadius: 'var(--embr-radius-md)', maxWidth: '100%', marginBottom: message.content ? '0.5rem' : 0, display: 'block' }}
                loading="lazy"
              />
            )}
            {message.type === MessageType.VIDEO && message.mediaUrl && (
              <video
                src={message.mediaUrl}
                controls
                style={{ borderRadius: 'var(--embr-radius-md)', maxWidth: '100%', marginBottom: message.content ? '0.5rem' : 0, display: 'block' }}
              />
            )}
            {message.type === MessageType.FILE && message.mediaUrl && (
              <a
                href={message.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  fontSize: '0.85rem', textDecoration: 'underline',
                  color: isOwnMessage ? '#fff' : 'var(--embr-accent)',
                  marginBottom: message.content ? '0.4rem' : 0,
                }}
              >
                <svg style={{ width: '16px', height: '16px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {message.fileName || 'Download file'}
              </a>
            )}

            {/* Text */}
            {message.content && (
              <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-words' }}>
                {message.content}
              </p>
            )}
          </div>

          {/* Timestamp + read receipt */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
            marginTop: '0.2rem', padding: '0 0.25rem',
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--embr-muted-text)' }}>
              {formatMessageTimestamp(message.createdAt)}
            </span>
            {isOwnMessage && (
              <span style={{ fontSize: '0.72rem', color: 'var(--embr-muted-text)' }}>
                {message.status === 'READ' && '✓✓'}
                {message.status === 'DELIVERED' && '✓'}
                {message.status === 'SENT' && '○'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
          <Avatar
            url={conversation.otherUser.profile.avatarUrl}
            name={conversation.otherUser.profile.displayName}
            size={30}
          />
          <div style={{
            borderRadius: 'var(--embr-radius-lg) var(--embr-radius-lg) var(--embr-radius-lg) var(--embr-radius-sm)',
            padding: '0.6rem 0.9rem',
            background: 'var(--embr-surface)',
            border: '1px solid var(--embr-border)',
            display: 'flex', gap: '4px', alignItems: 'center',
          }}>
            {[0, 150, 300].map((delay) => (
              <div
                key={delay}
                className="animate-bounce"
                style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: 'var(--embr-neutral-400)',
                  animationDelay: `${delay}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Group by date
  const messagesByDate: Record<string, MessageWithSender[]> = {};
  messages.forEach((msg) => {
    const date = format(new Date(msg.createdAt), 'yyyy-MM-dd');
    if (!messagesByDate[date]) messagesByDate[date] = [];
    messagesByDate[date].push(msg);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--embr-bg)' }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--embr-border)',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: 'var(--embr-bg)',
      }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: '0.4rem', borderRadius: '50%', border: 'none',
              background: 'none', cursor: 'pointer', display: 'flex',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--embr-surface)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
          >
            <svg style={{ width: '20px', height: '20px', color: 'var(--embr-muted-text)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <Avatar
          url={conversation.otherUser.profile.avatarUrl}
          name={conversation.otherUser.profile.displayName}
          size={38}
        />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--embr-text)' }}>
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
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--embr-muted-text)' }}>
            @{conversation.otherUser.username}
          </p>
        </div>

        <div
          style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: isConnected ? '#4caf50' : 'var(--embr-neutral-300)',
            flexShrink: 0,
          }}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', textAlign: 'center',
          }}>
            <svg style={{ width: '48px', height: '48px', color: 'var(--embr-neutral-300)', marginBottom: '0.75rem' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p style={{ fontSize: '0.875rem', color: 'var(--embr-muted-text)' }}>
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <>
            {Object.entries(messagesByDate).map(([dateString, dateMessages]) => (
              <div key={dateString}>
                {/* Date divider */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '1rem 0',
                }}>
                  <div style={{
                    background: 'var(--embr-surface)',
                    border: '1px solid var(--embr-border)',
                    borderRadius: '999px',
                    padding: '0.2rem 0.75rem',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)', fontWeight: '500' }}>
                      {formatDateDivider(dateString)}
                    </span>
                  </div>
                </div>

                {dateMessages.map((message) =>
                  renderMessage(message, message.senderId === conversation.otherUser.id ? false : true),
                )}
              </div>
            ))}

            {renderTypingIndicator()}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <MessageInput
        onSendMessage={onSendMessage}
        onTyping={onTyping}
        disabled={!isConnected}
      />
    </div>
  );
};
