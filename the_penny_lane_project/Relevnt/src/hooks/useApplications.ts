import { useCallback } from 'react';
import { Application } from '../types/application';
import { fetchApplications } from '../api/applications';
import { useSupabaseQuery } from './useSupabaseQuery';

interface UseApplicationsResult {
  applications: Application[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApplications(): UseApplicationsResult {
  // Stabilise the query function reference so useSupabaseQuery's effect deps
  // don't change on every render.
  const queryFn = useCallback(() => fetchApplications(), []);

  const { data, loading, error, refetch } = useSupabaseQuery<Application[]>(queryFn);

  return {
    applications: data ?? [],
    loading,
    error,
    refetch,
  };
}
