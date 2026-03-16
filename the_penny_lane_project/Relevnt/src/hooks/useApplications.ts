import { useState, useEffect, useCallback } from 'react';
import { Application } from '../types/application';
import { fetchApplications } from '../api/applications';

interface UseApplicationsResult {
  applications: Application[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApplications(): UseApplicationsResult {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApplications();
      setApplications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { applications, loading, error, refetch: load };
}
