-- =============================================================
-- Migration: 20260319000000_fix_ai_usage_log_fk_constraint
-- Purpose:   Introduce the ai_usage_log table with a single,
--            canonical FK constraint on user_id (ON DELETE CASCADE).
--
-- Background:
--   LYRA finding CONSTRAINT-VIOLATION-001 identified two FK constraints
--   on ai_usage_log.user_id with conflicting ON DELETE behaviour:
--     • One constraint with ON DELETE CASCADE (correct).
--     • One constraint without ON DELETE CASCADE, i.e. ON DELETE NO ACTION
--       (incorrect — blocks user deletion that expects CASCADE propagation).
--
--   This migration resolves that conflict by:
--     1. Creating the table if it does not yet exist, with the correct
--        schema and a single ON DELETE CASCADE FK from the outset.
--     2. If the table already exists, dropping any FK constraint on
--        ai_usage_log.user_id that does NOT use ON DELETE CASCADE.
--     3. Adding the canonical CASCADE FK if it is absent after the cleanup.
--     4. Enabling Row Level Security with appropriate policies.
--
-- Access model:
--   - authenticated: owning user may read their own rows.
--   - service_role:  full access (used by Netlify AI feature functions).
--   - No other roles have direct access.
--
-- Fixes: LYRA finding CONSTRAINT-VIOLATION-001 (PLP-5)
-- =============================================================

-- ── 1. Create table (idempotent) ──────────────────────────────────────────────
-- The table is created WITHOUT an inline FK so that Step 2 and Step 3
-- can manage the constraint explicitly and avoid any risk of duplicates.
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL,
  feature       TEXT        NOT NULL,
  model         TEXT,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  cost_usd      NUMERIC(10, 6),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Drop all non-CASCADE FK constraints on ai_usage_log.user_id ────────────
-- Handles the case where the table already existed with a conflicting FK
-- (ON DELETE NO ACTION / RESTRICT / SET NULL / SET DEFAULT).
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.conname
    FROM   pg_constraint c
    JOIN   pg_class      t ON t.oid = c.conrelid
    JOIN   pg_namespace  n ON n.oid = t.relnamespace
    JOIN   pg_attribute  a ON a.attrelid = t.oid
                          AND a.attnum   = ANY(c.conkey)
    WHERE  n.nspname   = 'public'
    AND    t.relname   = 'ai_usage_log'
    AND    c.contype   = 'f'           -- FK constraint
    AND    a.attname   = 'user_id'
    AND    c.confdeltype != 'c'        -- 'c' = CASCADE; keep only CASCADE FKs
  LOOP
    EXECUTE format(
      'ALTER TABLE public.ai_usage_log DROP CONSTRAINT %I',
      rec.conname
    );
    RAISE NOTICE 'Dropped non-CASCADE FK constraint: %', rec.conname;
  END LOOP;
END;
$$;

-- ── 3. Add the canonical CASCADE FK if it is not already present ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_class      t ON t.oid = c.conrelid
    JOIN   pg_namespace  n ON n.oid = t.relnamespace
    WHERE  n.nspname     = 'public'
    AND    t.relname     = 'ai_usage_log'
    AND    c.contype     = 'f'
    AND    c.confdeltype = 'c'         -- CASCADE only
  ) THEN
    ALTER TABLE public.ai_usage_log
      ADD CONSTRAINT ai_usage_log_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    RAISE NOTICE 'Added CASCADE FK constraint: ai_usage_log_user_id_fkey';
  ELSE
    RAISE NOTICE 'CASCADE FK constraint already present on ai_usage_log.user_id — skipping.';
  END IF;
END;
$$;

-- ── 4. Index to support fast per-user lookups ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_id
  ON public.ai_usage_log (user_id);

-- ── 5. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Owning user may read their own usage history.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  tablename  = 'ai_usage_log'
    AND    policyname = 'ai_usage_log_owner_select'
  ) THEN
    CREATE POLICY "ai_usage_log_owner_select"
      ON public.ai_usage_log
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- Service role (Netlify AI feature functions) has full access.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  tablename  = 'ai_usage_log'
    AND    policyname = 'ai_usage_log_service_role'
  ) THEN
    CREATE POLICY "ai_usage_log_service_role"
      ON public.ai_usage_log
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;
