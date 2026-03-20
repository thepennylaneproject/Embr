-- =============================================================
-- Migration: 20260319000000_cover_letter_ownership_constraints
-- Purpose:   Enforce same-owner relationship for cover_letters
--            linked to applications and resumes.
--
-- Problem:   The FKs on cover_letters.application_id and
--            cover_letters.resume_id only enforce existence,
--            not that the linked entity belongs to the same
--            user as the cover letter. The existing RLS policy
--            "cover_letters: owner all" uses a single USING
--            expression that only checks user_id = auth.uid()
--            and does not verify the ownership of referenced
--            entities. If RLS or policy checks regress, a user
--            could insert a cover letter linking another user's
--            application or resume.
--
-- Fix:       1. Replace the single FOR ALL policy with separate
--               per-operation policies so INSERT and UPDATE carry
--               an explicit WITH CHECK clause that validates
--               application_id and resume_id ownership.
--            2. Create a SECURITY DEFINER RPC function
--               upsert_cover_letter that enforces the same
--               ownership rules at the function level, providing
--               a safe server-side write path for client code.
--
-- Fixes: LYRA finding data-orphaned-data-001 (PLP-44)
-- =============================================================

-- ── Step 1: Split "owner all" into explicit per-operation policies ──────────
-- The original policy used FOR ALL with only a USING expression, which
-- Postgres applies as both the row-visibility filter and the write-check.
-- Splitting gives us independent WITH CHECK clauses for writes.

DROP POLICY IF EXISTS "cover_letters: owner all" ON public.cover_letters;

-- SELECT: read own rows only (unchanged behaviour)
CREATE POLICY "cover_letters: owner select"
  ON public.cover_letters FOR SELECT
  USING (auth.uid() = user_id);

-- DELETE: delete own rows only (unchanged behaviour)
CREATE POLICY "cover_letters: owner delete"
  ON public.cover_letters FOR DELETE
  USING (auth.uid() = user_id);

-- INSERT: write own rows AND verify linked entities belong to the same user.
-- A NULL application_id or resume_id is always allowed (the columns are
-- optional); a non-NULL value must reference a row owned by the caller.
CREATE POLICY "cover_letters: owner insert"
  ON public.cover_letters FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      application_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.applications
        WHERE id = application_id AND user_id = auth.uid()
      )
    )
    AND (
      resume_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.resumes
        WHERE id = resume_id AND user_id = auth.uid()
      )
    )
  );

-- UPDATE: same ownership checks applied to both the row being modified
-- (USING) and the new values being written (WITH CHECK).
CREATE POLICY "cover_letters: owner update"
  ON public.cover_letters FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      application_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.applications
        WHERE id = application_id AND user_id = auth.uid()
      )
    )
    AND (
      resume_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.resumes
        WHERE id = resume_id AND user_id = auth.uid()
      )
    )
  );

-- ── Step 2: RPC function for safe server-side cover letter writes ───────────
-- upsert_cover_letter validates ownership of the caller, the linked
-- application, and the linked resume before performing the write.
-- Clients should prefer this RPC over raw table upserts to get structured
-- ownership errors rather than opaque RLS permission denials.
--
-- SECURITY DEFINER is intentional: the function runs with the privileges of
-- its defining role so it can do cross-table ownership lookups without
-- granting the caller SELECT on unrelated rows of other users. The function
-- still enforces auth.uid() checks internally.

CREATE OR REPLACE FUNCTION public.upsert_cover_letter(
  p_id              uuid      DEFAULT NULL,
  p_user_id         uuid      DEFAULT NULL,
  p_title           text      DEFAULT NULL,
  p_content         text      DEFAULT NULL,
  p_application_id  uuid      DEFAULT NULL,
  p_resume_id       uuid      DEFAULT NULL,
  p_job_id          text      DEFAULT NULL,
  p_job_description text      DEFAULT NULL,
  p_company_name    text      DEFAULT NULL,
  p_ai_generated    boolean   DEFAULT false,
  p_template_used   text      DEFAULT NULL
)
RETURNS public.cover_letters
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_result    public.cover_letters;
BEGIN
  -- Caller must be authenticated.
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'upsert_cover_letter: caller is not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- user_id in payload, if supplied, must match the authenticated caller.
  IF p_user_id IS NOT NULL AND p_user_id <> v_caller_id THEN
    RAISE EXCEPTION 'upsert_cover_letter: user_id does not match authenticated user'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- For updates, verify the caller owns the target cover letter row.
  IF p_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.cover_letters
      WHERE id = p_id AND user_id = v_caller_id
    ) THEN
      RAISE EXCEPTION 'upsert_cover_letter: cover letter % does not belong to caller', p_id
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  -- Validate application ownership when application_id is provided.
  IF p_application_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.applications
      WHERE id = p_application_id AND user_id = v_caller_id
    ) THEN
      RAISE EXCEPTION
        'upsert_cover_letter: application % does not belong to caller', p_application_id
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  -- Validate resume ownership when resume_id is provided.
  IF p_resume_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.resumes
      WHERE id = p_resume_id AND user_id = v_caller_id
    ) THEN
      RAISE EXCEPTION
        'upsert_cover_letter: resume % does not belong to caller', p_resume_id
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  INSERT INTO public.cover_letters (
    id,
    user_id,
    title,
    content,
    application_id,
    resume_id,
    job_id,
    job_description,
    company_name,
    ai_generated,
    template_used,
    updated_at
  )
  VALUES (
    COALESCE(p_id, gen_random_uuid()),
    v_caller_id,
    p_title,
    p_content,
    p_application_id,
    p_resume_id,
    p_job_id,
    p_job_description,
    p_company_name,
    COALESCE(p_ai_generated, false),
    p_template_used,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    title           = EXCLUDED.title,
    content         = EXCLUDED.content,
    application_id  = EXCLUDED.application_id,
    resume_id       = EXCLUDED.resume_id,
    job_id          = EXCLUDED.job_id,
    job_description = EXCLUDED.job_description,
    company_name    = EXCLUDED.company_name,
    ai_generated    = EXCLUDED.ai_generated,
    template_used   = EXCLUDED.template_used,
    updated_at      = EXCLUDED.updated_at
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users only.
REVOKE ALL ON FUNCTION public.upsert_cover_letter(
  uuid, uuid, text, text, uuid, uuid, text, text, text, boolean, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.upsert_cover_letter(
  uuid, uuid, text, text, uuid, uuid, text, text, text, boolean, text
) TO authenticated;
