import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { CoverLetter, CoverLetterInsert } from '../types/supabase';

interface UseCoverLettersResult {
  coverLetters: CoverLetter[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  upsertCoverLetter: (payload: CoverLetterInsert) => Promise<CoverLetter>;
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
      if (applicationId) {
        const { data, error: fetchError } = await supabase
          .from('cover_letters')
          .select('*')
          .eq('application_id', applicationId)
          .order('created_at', { ascending: false });
        if (fetchError) throw fetchError;
        setCoverLetters(data ?? []);
      } else {
        const { data, error: fetchError } = await supabase
          .from('cover_letters')
          .select('*')
          .order('created_at', { ascending: false });
        if (fetchError) throw fetchError;
        setCoverLetters(data ?? []);
      }
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
    async (payload: CoverLetterInsert): Promise<CoverLetter> => {
      const { data, error: upsertError } = await supabase
        .from('cover_letters')
        .upsert(payload)
        .select()
        .single();

      if (upsertError) throw upsertError;
      if (!data) throw new Error('No data returned from upsert');
      await load();
      return data;
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
