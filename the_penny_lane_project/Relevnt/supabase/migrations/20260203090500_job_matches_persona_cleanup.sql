-- =============================================================
-- Migration: 20260203090500_job_matches_persona_cleanup
-- Purpose:   Introduce the personas and job_matches tables and
--            perform a one-time cleanup of orphaned job_matches
--            rows left over from manual data imports.
--
-- BUG (ORPHANED-DATA-001): The persona_id FK constraint is
--   dropped mid-migration to allow the DELETE to run without
--   triggering FK-violation errors, but it is never re-added.
--   After this migration, persona deletions no longer cascade to
--   job_matches, leaving orphaned rows that reference deleted
--   personas.
--
-- Fix: See migration 20260319000000_job_matches_persona_fk_restore.sql
-- =============================================================

-- ── personas ──────────────────────────────────────────────────
-- Represents a scoring "persona" that a user can configure to
-- express a particular career focus (e.g. "Frontend Engineer",
-- "ML Researcher").  A user may have many personas; each one
-- influences how the matching engine scores job listings.
CREATE TABLE IF NOT EXISTS public.personas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personas: owner all"
  ON public.personas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── job_matches ───────────────────────────────────────────────
-- Persists the result of the matching engine's scoring pass for
-- a (user, job, persona) triple.  persona_id links back to the
-- persona configuration that produced this match score.
CREATE TABLE IF NOT EXISTS public.job_matches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id      TEXT        NOT NULL,
  persona_id  UUID        NOT NULL,
  score       REAL        NOT NULL DEFAULT 0,
  matched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_matches_persona_id_fkey
    FOREIGN KEY (persona_id) REFERENCES public.personas(id) ON DELETE CASCADE
);

ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_matches: owner all"
  ON public.job_matches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_job_matches_user_id
  ON public.job_matches (user_id);

CREATE INDEX IF NOT EXISTS idx_job_matches_persona_id
  ON public.job_matches (persona_id);

-- ── One-time orphan cleanup ────────────────────────────────────
-- Remove job_matches rows imported before the FK existed whose
-- persona_id no longer corresponds to any personas row.
--
-- BUG: The FK constraint is temporarily dropped here so the
--   DELETE can run, but it is mistakenly never re-added after
--   the cleanup completes.  This leaves job_matches.persona_id
--   as a plain, unconstrained UUID column.
ALTER TABLE public.job_matches
  DROP CONSTRAINT IF EXISTS job_matches_persona_id_fkey;

DELETE FROM public.job_matches
WHERE persona_id NOT IN (SELECT id FROM public.personas);
