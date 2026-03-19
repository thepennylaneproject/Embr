/**
 * useMessaging Hook
 * React hook for real-time messaging with WebSocket support
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  WebSocketEvent,
  MessageWithSender,
  ConversationPreview,
  ConversationWithDetails,
  TypingIndicator,
  SendMessageRequest,
  MarkAsReadRequest,
  SearchMessagesRequest,
  GetConversationsRequest,
  GetMessagesRequest,
  CreateConversationRequest,
  MessageType,
  MessageStatus,
} from "@shared/types/messaging.types";
import { messagingAPI } from "@shared/api/messaging.api";

interface UseMessagingOptions {
  autoConnect?: boolean;
  onMessage?: (
    message: MessageWithSender,
    conversation: ConversationWithDetails,
  ) => void;
  onMessageRead?: (data: {
    conversationId: string;
    messageIds?: string[];
    readBy: string;
    readAt: string;
  }) => void;
  onTypingIndicator?: (indicator: TypingIndicator) => void;
  onError?: (error: any) => void;
}

const ACK_TIMEOUT_MS = 10000;

export function useMessaging(options: UseMessagingOptions = {}) {
  const {
    autoConnect = true,
    onMessage,
    onMessageRead,
    onTypingIndicator,
    onError,
  } = options;

  // State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [messages, setMessages] = useState<Record<string, MessageWithSender[]>>(
    {},
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<
    Record<string, TypingIndicator>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs to prevent stale closures
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Stable refs for caller-provided callbacks so that reconnect doesn't happen
  // when a caller passes new inline function references on re-render.
  const onMessageRef = useRef(onMessage);
  const onMessageReadRef = useRef(onMessageRead);
  const onTypingIndicatorRef = useRef(onTypingIndicator);
  const onErrorRef = useRef(onError);
  // Keep refs current without triggering re-renders
  onMessageRef.current = onMessage;
  onMessageReadRef.current = onMessageRead;
  onTypingIndicatorRef.current = onTypingIndicator;
  onErrorRef.current = onError;

  // Fire-and-forget wrapper that guards against unhandled rejections in user-provided
  // onError callbacks, logging any callback failures while keeping the latest callback
  // via ref without re-creating the wrapper.
  const safelyInvokeOnError = useCallback(
    (error: unknown) => {
      try {
        void Promise.resolve(onErrorRef.current?.(error)).catch((callbackError) => {
          console.error(
            "[useMessaging] Unhandled rejection in onError callback:",
            callbackError,
          );
        });
      } catch (callbackError) {
        console.error(
          "[useMessaging] Synchronous error in onError callback:",
          callbackError,
        );
      }
    },
    [], // onErrorRef is a ref; latest callback is read without re-creating this wrapper
  );

  // ============================================================
  // WEBSOCKET CONNECTION
  // ============================================================

  const connect = useCallback(() => {
    // WebSocket connection uses httpOnly cookies for authentication
    // Cookies are automatically sent by the browser with the request
    const newSocket = io(
      `${process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3003"}/messaging`,
      {
        transports: ["websocket", "polling"],
        withCredentials: true, // Enable sending cookies with WebSocket requests
      },
    );

    // Connection events
    newSocket.on("connect", () => {
      setIsConnected(true);
      setError(null);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("WebSocket connection error:", err);
      setError(err);
      safelyInvokeOnError(err);
    });

    // Message events
    newSocket.on(
      WebSocketEvent.MESSAGE_RECEIVE,
      ({ message, conversation }) => {

        // Add message to local state
        setMessages((prev) => ({
          ...prev,
          [conversation.id]: [...(prev[conversation.id] || []), message],
        }));

        // Update conversation list
        setConversations((prev) => {
          const filtered = prev.filter((c) => c.id !== conversation.id);
          return [
            {
              id: conversation.id,
              otherUser:
                conversation.participant1Id === message.senderId
                  ? conversation.participant1
                  : conversation.participant2,
              lastMessage: message,
              unreadCount:
                (prev.find((c) => c.id === conversation.id)?.unreadCount || 0) +
                1,
              lastMessageAt: message.createdAt,
            },
            ...filtered,
          ];
        });

        // Update unread count
        setUnreadCount((prev) => prev + 1);

        onMessageRef.current?.(message, conversation);
      },
    );

    newSocket.on(WebSocketEvent.MESSAGE_READ, (data) => {

      // Update message statuses
      if (data.messageIds) {
        setMessages((prev) => {
          const conversationMessages = prev[data.conversationId] || [];
          const updated = conversationMessages.map((msg) =>
            data.messageIds.includes(msg.id)
              ? { ...msg, status: MessageStatus.READ, readAt: data.readAt }
              : msg,
          );
          return { ...prev, [data.conversationId]: updated };
        });
      }

      onMessageReadRef.current?.(data);
    });

    // Typing indicator events
    newSocket.on(
      WebSocketEvent.TYPING_INDICATOR,
      (indicator: TypingIndicator) => {
        const key = `${indicator.conversationId}-${indicator.userId}`;

        if (indicator.isTyping) {
          setTypingUsers((prev) => ({ ...prev, [key]: indicator }));

          // Clear existing timeout
          if (typingTimeoutsRef.current[key]) {
            clearTimeout(typingTimeoutsRef.current[key]);
          }

          // Auto-clear after 3 seconds
          typingTimeoutsRef.current[key] = setTimeout(() => {
            setTypingUsers((prev) => {
              const { [key]: removed, ...rest } = prev;
              return rest;
            });
            delete typingTimeoutsRef.current[key];
          }, 3004);
        } else {
          setTypingUsers((prev) => {
            const { [key]: removed, ...rest } = prev;
            return rest;
          });

          if (typingTimeoutsRef.current[key]) {
            clearTimeout(typingTimeoutsRef.current[key]);
            delete typingTimeoutsRef.current[key];
          }
        }

        onTypingIndicatorRef.current?.(indicator);
      },
    );

    // Error events
    newSocket.on(WebSocketEvent.ERROR, (err) => {
      console.error("WebSocket error:", err);
      setError(err);
      safelyInvokeOnError(err);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  // Callback refs are stable so `connect` identity doesn't change on re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  const emitWithAck = useCallback(
    <TResponse = any>(event: WebSocketEvent, payload: any): Promise<TResponse> => {
      if (!socketRef.current || !socketRef.current.connected) {
        return Promise.reject(new Error("WebSocket not connected"));
      }

      return new Promise<TResponse>((resolve, reject) => {
        const currentSocket = socketRef.current!;

        const timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error("WebSocket acknowledgment timed out"));
        }, ACK_TIMEOUT_MS);

        const onDisconnect = () => {
          cleanup();
          reject(new Error("WebSocket disconnected before acknowledgment"));
        };

        const onConnectError = (err: any) => {
          cleanup();
          reject(err || new Error("WebSocket connection error before acknowledgment"));
        };

        const cleanup = () => {
          clearTimeout(timeoutId);
          currentSocket.off("disconnect", onDisconnect);
          currentSocket.off("connect_error", onConnectError);
        };

        currentSocket.on("disconnect", onDisconnect);
        currentSocket.on("connect_error", onConnectError);
        currentSocket.emit(event, payload, (response: any) => {
          cleanup();
          if (response?.error) {
            reject(response.error);
            return;
          }
          resolve(response as TResponse);
        });
      });
    },
    [],
  );

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
      // Clear all typing timeouts
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [autoConnect, connect, disconnect]);

  // ============================================================
  // CONVERSATION METHODS
  // ============================================================

  const fetchConversations = useCallback(
    async (params: GetConversationsRequest = {}) => {
      setLoading(true);
      setError(null);

      try {
        const response = await messagingAPI.getConversations(params);
        setConversations(response.conversations);
        return response;
      } catch (err: any) {
        setError(err);
        safelyInvokeOnError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [safelyInvokeOnError],
  );

  const createConversation = useCallback(
    async (payload: CreateConversationRequest) => {
      setLoading(true);
      setError(null);

      try {
        const response = await messagingAPI.createConversation(payload);

        // Add to conversations list
        setConversations((prev) => [
          {
            id: response.conversation.id,
            otherUser:
              response.conversation.participant1Id === payload.participantId
                ? response.conversation.participant1
                : response.conversation.participant2,
            lastMessage: response.message || null,
            unreadCount: 0,
            lastMessageAt: response.conversation.lastMessageAt,
          },
          ...prev,
        ]);

        return response;
      } catch (err: any) {
        setError(err);
        safelyInvokeOnError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [safelyInvokeOnError],
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      setLoading(true);
      setError(null);

      try {
        await messagingAPI.deleteConversation({ conversationId });

        // Remove from local state
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        setMessages((prev) => {
          const { [conversationId]: removed, ...rest } = prev;
          return rest;
        });
      } catch (err: any) {
        setError(err);
        safelyInvokeOnError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [safelyInvokeOnError],
  );

  // ============================================================
  // MESSAGE METHODS
  // ============================================================

  const sendMessage = useCallback(
    async (payload: SendMessageRequest) => {
      if (!socket || !isConnected) {
        throw new Error("WebSocket not connected");
      }

      const response = await emitWithAck<any>(WebSocketEvent.MESSAGE_SEND, payload);

      if (payload.conversationId && response?.message) {
        setMessages((prev) => ({
          ...prev,
          [payload.conversationId!]: [
            ...(prev[payload.conversationId!] || []),
            response.message,
          ],
        }));
      }
    },
    [socket, isConnected, emitWithAck],
  );

  const fetchMessages = useCallback(
    async (params: GetMessagesRequest) => {
      setLoading(true);
      setError(null);

      try {
        const response = await messagingAPI.getMessages(params);
        setMessages((prev) => ({
          ...prev,
          [params.conversationId]: response.messages,
        }));
        return response;
      } catch (err: any) {
        setError(err);
        safelyInvokeOnError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [safelyInvokeOnError],
  );

  const markAsRead = useCallback(
    async (payload: MarkAsReadRequest) => {
      if (!socket || !isConnected) {
        // Fallback to HTTP if WebSocket not available
        try {
          const response = await messagingAPI.markAsRead(payload);

          // Update local state
          setConversations((prev) =>
            prev.map((c) =>
              c.id === payload.conversationId ? { ...c, unreadCount: 0 } : c,
            ),
          );

          setUnreadCount((prev) => Math.max(0, prev - response.updatedCount));

          return response;
        } catch (err: any) {
          setError(err);
          safelyInvokeOnError(err);
          throw err;
        }
      }

      const response = await emitWithAck<any>(WebSocketEvent.MESSAGE_READ, payload);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === payload.conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      );

      if (response?.updatedCount) {
        setUnreadCount((prev) => Math.max(0, prev - response.updatedCount));
      }

      return response;
    },
    [socket, isConnected, safelyInvokeOnError, emitWithAck],
  );

  const searchMessages = useCallback(
    async (params: SearchMessagesRequest) => {
      setLoading(true);
      setError(null);

      try {
        const response = await messagingAPI.searchMessages(params);
        return response;
      } catch (err: any) {
        setError(err);
        safelyInvokeOnError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [safelyInvokeOnError],
  );

  const deleteMessage = useCallback(
    async (messageId: string, conversationId: string) => {
      setLoading(true);
      setError(null);

      try {
        await messagingAPI.deleteMessage({ messageId, conversationId });

        // Update local state
        setMessages((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).filter(
            (msg) => msg.id !== messageId,
          ),
        }));
      } catch (err: any) {
        setError(err);
        safelyInvokeOnError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [safelyInvokeOnError],
  );

  // ============================================================
  // TYPING INDICATOR METHODS
  // ============================================================

  const sendTypingIndicator = useCallback(
    (conversationId: string, isTyping: boolean) => {
      if (!socket || !isConnected) return;

      const event = isTyping
        ? WebSocketEvent.TYPING_START
        : WebSocketEvent.TYPING_STOP;

      socket.emit(event, { conversationId, isTyping });
    },
    [socket, isConnected],
  );

  const getTypingUsers = useCallback(
    (conversationId: string): TypingIndicator[] => {
      return Object.values(typingUsers).filter(
        (indicator) =>
          indicator.conversationId === conversationId && indicator.isTyping,
      );
    },
    [typingUsers],
  );

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await messagingAPI.getUnreadCount();
      setUnreadCount(response.totalUnread);
      return response;
    } catch (err: any) {
      setError(err);
      safelyInvokeOnError(err);
      throw err;
    }
  }, [safelyInvokeOnError]);

  const uploadMedia = useCallback(
    async (file: File, conversationId: string, type: MessageType) => {
      setLoading(true);
      setError(null);

      try {
        const response = await messagingAPI.uploadMedia({
          file,
          conversationId,
          type,
        });
        return response;
      } catch (err: any) {
        setError(err);
        safelyInvokeOnError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [safelyInvokeOnError],
  );

  return {
    // State
    socket,
    isConnected,
    conversations,
    messages,
    unreadCount,
    typingUsers,
    loading,
    error,

    // Connection
    connect,
    disconnect,

    // Conversations
    fetchConversations,
    createConversation,
    deleteConversation,

    // Messages
    sendMessage,
    fetchMessages,
    markAsRead,
    searchMessages,
    deleteMessage,

    // Typing
    sendTypingIndicator,
    getTypingUsers,

    // Utilities
    fetchUnreadCount,
    uploadMedia,
  };
}
