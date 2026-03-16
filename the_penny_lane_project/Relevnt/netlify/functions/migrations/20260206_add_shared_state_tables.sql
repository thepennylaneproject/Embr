-- =============================================================
-- Migration: 20260206_add_shared_state_tables
-- Purpose:   Create shared state tables used by Netlify functions
--            for provider health monitoring and ATS detection caching.
--
-- NOTE: These tables were initially created in the netlify/functions
--       migration track and are NOT managed by supabase/migrations.
--       They were created WITHOUT ENABLE ROW LEVEL SECURITY, meaning
--       any authenticated Supabase client (even anon role) could read
--       or write to them.
--
--       This is the source of LYRA finding data-missing-rls-001.
--       Fix: see supabase/migrations/20260316000000_provider_health_ats_rls.sql
-- =============================================================

-- provider_health tracks the uptime and response health of each
-- external job data provider (e.g. LinkedIn, Indeed, Greenhouse).
CREATE TABLE IF NOT EXISTS provider_health (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name   TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'unknown'
                              CHECK (status IN ('healthy', 'degraded', 'down', 'unknown')),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_time_ms INTEGER,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_health_provider_name_key
  ON provider_health (provider_name);

-- ats_detection_cache stores per-job-listing results of ATS fingerprinting
-- so the detection logic does not re-run for each request.
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

-- INTENTIONALLY NO "ENABLE ROW LEVEL SECURITY" — see note above.
