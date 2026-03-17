-- =============================================================
-- Migration: 20260316000000_provider_health_ats_rls
-- Purpose:   Consolidate provider_health and ats_detection_cache
--            DDL into the canonical supabase/migrations track and
--            enable Row Level Security with service_role-only policies.
--
-- Background:
--   These two tables were originally created by the Netlify function
--   migration netlify/functions/migrations/20260206_add_shared_state_tables.sql
--   without ENABLE ROW LEVEL SECURITY, leaving them accessible to any
--   Supabase client role (including `anon` and `authenticated`).
--
--   This migration:
--     1. Ensures the tables exist with the authoritative DDL (idempotent).
--     2. Enables RLS on both tables.
--     3. Applies service_role-only policies, matching the pattern
--        established in 20260305220000_create_missing_shared_tables.sql.
--
-- Access model:
--   - service_role: full access (used by all Netlify background functions).
--   - authenticated / anon: NO direct access. Data is surfaced to end
--     users only via Netlify function responses, never raw DB queries.
--
-- Fixes: LYRA finding data-missing-rls-001 (PLP-36)
-- =============================================================

-- ── provider_health ───────────────────────────────────────────
-- Tracks uptime and response health of each external job data provider.
CREATE TABLE IF NOT EXISTS provider_health (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name    TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'unknown'
                               CHECK (status IN ('healthy', 'degraded', 'down', 'unknown')),
  last_checked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_time_ms INTEGER,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_health_provider_name_key
  ON provider_health (provider_name);

ALTER TABLE provider_health ENABLE ROW LEVEL SECURITY;

-- Service role (Netlify functions) has full access.
CREATE POLICY "provider_health_service_role" ON provider_health
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other roles may access this table directly.

-- ── ats_detection_cache ───────────────────────────────────────
-- Caches per-job-listing ATS fingerprinting results so detection
-- logic does not re-run on every request.
CREATE TABLE IF NOT EXISTS ats_detection_cache (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_listing_id   TEXT        NOT NULL,
  ats_name         TEXT,
  confidence_score REAL,
  raw_signals      JSONB,
  detected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ats_detection_cache_job_listing_id_key
  ON ats_detection_cache (job_listing_id);

ALTER TABLE ats_detection_cache ENABLE ROW LEVEL SECURITY;

-- Service role (Netlify functions) has full access.
CREATE POLICY "ats_detection_cache_service_role" ON ats_detection_cache
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No other roles may access this table directly.
