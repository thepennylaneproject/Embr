/**
 * One Socket.io client per browser tab for `/messaging` (f-perf-012).
 * React 18 Strict Mode unmount/remount would otherwise open duplicate connections;
 * we refcount and debounce teardown so a quick remount reuses the same socket.
 */

import { io, Socket } from 'socket.io-client';

const state: {
  socket: Socket | null;
  url: string;
  refs: number;
} = { socket: null, url: '', refs: 0 };

let teardownTimer: ReturnType<typeof setTimeout> | null = null;
const TEARDOWN_MS = 250;

export function getMessagingNamespaceUrl(): string {
  return `${process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003'}/messaging`;
}

export function acquireMessagingSocket(): Socket {
  if (teardownTimer) {
    clearTimeout(teardownTimer);
    teardownTimer = null;
  }

  const url = getMessagingNamespaceUrl();

  if (state.socket && state.url === url) {
    state.refs += 1;
    if (!state.socket.connected) {
      state.socket.connect();
    }
    return state.socket;
  }

  if (state.socket) {
    state.socket.removeAllListeners();
    state.socket.disconnect();
    state.socket = null;
  }

  const socket = io(url, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });
  state.socket = socket;
  state.url = url;
  state.refs = 1;
  return socket;
}

export function releaseMessagingSocket(): void {
  state.refs = Math.max(0, state.refs - 1);
  if (state.refs > 0) {
    return;
  }
  if (teardownTimer) {
    clearTimeout(teardownTimer);
  }
  teardownTimer = setTimeout(() => {
    teardownTimer = null;
    if (state.refs === 0 && state.socket) {
      state.socket.removeAllListeners();
      state.socket.disconnect();
      state.socket = null;
      state.url = '';
    }
  }, TEARDOWN_MS);
}
