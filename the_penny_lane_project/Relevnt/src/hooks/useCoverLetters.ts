import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { CoverLetter, CoverLetterInsert } from '../types/supabase';

interface UseCoverLettersResult {
  coverLetters: CoverLetter[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  upsertCoverLetter: (payload: CoverLetterInsert & { id?: string }) => Promise<CoverLetter>;
  deleteCoverLetter: (id: string) => Promise<void>;
}

export function useCoverLetters(applicationId?: string): UseCoverLettersResult {
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: CoverLetter[] | null = null;
      let fetchError: unknown = null;

      if (applicationId) {
        const result = await supabase
          .from('cover_letters')
          .select('*')
          .eq('application_id', applicationId)
          .order('created_at', { ascending: false });
        data = result.data as CoverLetter[] | null;
        fetchError = result.error;
      } else {
        const result = await supabase
          .from('cover_letters')
          .select('*')
          .order('created_at', { ascending: false });
        data = result.data as CoverLetter[] | null;
        fetchError = result.error;
      }

      if (fetchError) throw fetchError;
      setCoverLetters(data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load cover letters. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    load();
  }, [load]);

  const upsertCoverLetter = useCallback(
    async (payload: CoverLetterInsert & { id?: string }): Promise<CoverLetter> => {
      const { data, error: upsertError } = await supabase
        .from('cover_letters')
        .upsert(payload as CoverLetterInsert)
        .select()
        .single();

      if (upsertError) throw upsertError;
      await load();
      return data as CoverLetter;
    },
    [load]
  );

  const deleteCoverLetter = useCallback(
    async (id: string): Promise<void> => {
      const { error: deleteError } = await supabase
        .from('cover_letters')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await load();
    },
    [load]
  );

  return { coverLetters, loading, error, refetch: load, upsertCoverLetter, deleteCoverLetter };
}
