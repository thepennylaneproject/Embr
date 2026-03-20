-- =============================================================
-- Migration: 20260319000000_job_matches_persona_fk_restore
-- Purpose:   Restore the persona_id FK constraint on job_matches
--            that was inadvertently dropped by migration
--            20260203090500_job_matches_persona_cleanup.sql.
--
-- Fixes: ORPHANED-DATA-001
--
-- Root cause: 20260203090500 temporarily dropped the FK to allow
--   a bulk DELETE of orphaned rows, but never re-added it.  Any
--   persona deleted after that point left behind job_matches rows
--   with a dangling persona_id, corrupting the dataset silently.
--
-- Remediation steps applied here:
--   1. Delete any job_matches rows whose persona_id no longer
--      refers to an existing personas row (orphan sweep).
--   2. Re-add the FK constraint with ON DELETE CASCADE so future
--      persona deletions automatically clean up child rows.
-- =============================================================

-- ── Step 1: Orphan sweep ──────────────────────────────────────
-- Remove rows that already reference non-existent personas.
-- This is required before adding the FK; PostgreSQL will reject
-- the ALTER TABLE if referential integrity is already violated.
DELETE FROM public.job_matches
WHERE persona_id NOT IN (SELECT id FROM public.personas);

-- ── Step 2: Re-add the FK with ON DELETE CASCADE ──────────────
-- Use a conditional PL/pgSQL block so the migration is idempotent:
-- if the constraint was somehow already present (e.g. a partial
-- re-run), the block skips silently instead of raising an error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   information_schema.table_constraints  tc
    JOIN   information_schema.key_column_usage   kcu
           ON  kcu.constraint_name = tc.constraint_name
           AND kcu.table_schema    = tc.table_schema
    WHERE  tc.table_schema    = 'public'
    AND    tc.table_name      = 'job_matches'
    AND    tc.constraint_type = 'FOREIGN KEY'
    AND    kcu.column_name    = 'persona_id'
  ) THEN
    ALTER TABLE public.job_matches
      ADD CONSTRAINT job_matches_persona_id_fkey
      FOREIGN KEY (persona_id)
      REFERENCES public.personas(id)
      ON DELETE CASCADE;
  END IF;
END $$;
