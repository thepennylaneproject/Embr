/**
 * useSupabaseQuery.test.ts
 *
 * Tests for the active-guard fix in useSupabaseQuery (PLP-10).
 *
 * Requirements verified:
 *   1. No state update occurs after the component is unmounted while a
 *      slow query is in-flight (prevents the React warning and potential
 *      memory-leak patterns).
 *   2. The successful mounted path still sets data and clears loading.
 *   3. Errors on the mounted path are surfaced through the error state.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSupabaseQuery } from '../useSupabaseQuery';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a promise that can be resolved or rejected from outside. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSupabaseQuery', () => {
  describe('active guard — no state update after unmount (PLP-10)', () => {
    it('does not set data after the component unmounts', async () => {
      const { promise, resolve } = deferred<string[]>();
      const queryFn = vi.fn(() => promise);

      const { result, unmount } = renderHook(() => useSupabaseQuery(queryFn));

      // Immediately after mount the hook should be in loading state.
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();

      // Unmount BEFORE the promise resolves — the isActive flag is now false.
      unmount();

      // Resolve after unmount; the guard should prevent any setState calls.
      await act(async () => {
        resolve(['item-1', 'item-2']);
        // Flush the microtask queue so the async continuation runs.
        await Promise.resolve();
        await Promise.resolve();
      });

      // State must not have changed — still reflects pre-unmount snapshot.
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('does not set error after the component unmounts', async () => {
      const { promise, reject } = deferred<string[]>();
      const queryFn = vi.fn(() => promise);

      const { result, unmount } = renderHook(() => useSupabaseQuery(queryFn));

      unmount();

      await act(async () => {
        reject(new Error('network failure'));
        await Promise.resolve();
        await Promise.resolve();
      });

      // Error must not be set because the component unmounted first.
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(true);
    });
  });

  describe('successful mounted path', () => {
    it('sets data and clears loading when the query resolves', async () => {
      const mockData = ['app-1', 'app-2'];
      const queryFn = vi.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() => useSupabaseQuery(queryFn));

      // Initially loading, no data yet.
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });

    it('sets error and clears loading when the query rejects', async () => {
      const queryFn = vi
        .fn()
        .mockRejectedValue(new Error('Something went wrong'));

      const { result } = renderHook(() => useSupabaseQuery(queryFn));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe('Something went wrong');
    });

    it('uses a fallback message for non-Error rejections', async () => {
      const queryFn = vi.fn().mockRejectedValue('oops');

      const { result } = renderHook(() => useSupabaseQuery(queryFn));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('An unexpected error occurred.');
    });

    it('refetch re-runs the query and returns fresh data', async () => {
      let callCount = 0;
      const queryFn = vi.fn(async () => {
        callCount += 1;
        return [`result-${callCount}`];
      });

      const { result } = renderHook(() => useSupabaseQuery(queryFn));

      // Wait for the first query to complete.
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toEqual(['result-1']);

      // Trigger refetch.
      act(() => {
        result.current.refetch();
      });

      await waitFor(() => expect(result.current.data).toEqual(['result-2']));

      expect(queryFn).toHaveBeenCalledTimes(2);
    });
  });
});
