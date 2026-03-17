import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSupabaseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Generic hook for Supabase queries with proper unmount protection.
 *
 * All state updates are gated behind an `isActive` flag that is cleared
 * in the effect cleanup. This prevents state updates on unmounted components
 * when a slow query resolves after the component is gone, avoiding React's
 * "Can't perform a React state update on an unmounted component" warning and
 * potential memory leaks.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useSupabaseQuery(() => fetchFoo());
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<T>,
): UseSupabaseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trigger counter incremented by refetch() to re-run the effect.
  const [trigger, setTrigger] = useState(0);

  // Store the latest queryFn in a ref so that identity changes to the
  // function don't cause an extra effect run while still always using the
  // most-recent version when the query fires.
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const refetch = useCallback(() => {
    setTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    // Guard flag: set to false on cleanup so pending async work knows not to
    // touch state after the component has unmounted (or the effect re-ran).
    let isActive = true;

    const runQuery = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await queryFnRef.current();
        if (isActive) {
          setData(result);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred.',
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    runQuery();

    return () => {
      isActive = false;
    };
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch };
}
