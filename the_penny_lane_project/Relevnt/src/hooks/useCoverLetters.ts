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

/**
 * Builds the argument object for the upsert_cover_letter RPC from a
 * CoverLetterInsert payload, mapping camelCase / snake_case fields and
 * dropping user_id (the function always uses auth.uid() server-side).
 */
function toRpcArgs(payload: CoverLetterInsert & { id?: string }) {
  return {
    p_id: payload.id ?? null,
    // user_id is intentionally omitted so the RPC uses auth.uid() directly;
    // passing it allows the function to reject mismatches as an extra guard.
    p_user_id: payload.user_id ?? null,
    p_title: payload.title,
    p_content: payload.content,
    p_application_id: payload.application_id ?? null,
    p_resume_id: payload.resume_id ?? null,
    p_job_id: payload.job_id ?? null,
    p_job_description: payload.job_description ?? null,
    p_company_name: payload.company_name ?? null,
    p_ai_generated: payload.ai_generated ?? false,
    p_template_used: payload.template_used ?? null,
  };
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

  /**
   * Upsert a cover letter via the upsert_cover_letter RPC.
   *
   * The server-side function enforces that application_id and resume_id, when
   * provided, belong to the authenticated caller before writing. This prevents
   * cross-user reference contamination that a direct .upsert() call would not
   * catch if RLS policies ever regress.
   */
  const upsertCoverLetter = useCallback(
    async (payload: CoverLetterInsert & { id?: string }): Promise<CoverLetter> => {
      const { data, error: rpcError } = await supabase.rpc(
        'upsert_cover_letter',
        toRpcArgs(payload)
      );

      if (rpcError) throw rpcError;
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
