-- Migration: 20260305220000_create_missing_shared_tables
-- Creates four shared infrastructure tables used by the Relevnt scoring
-- engine, admin tooling, and cache management layer.

-- ---------------------------------------------------------------------------
-- market_snapshots
-- Periodic snapshots of job-market conditions, keyed by category and date.
-- Used by the scoring engine to weight signals against current market demand.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_snapshots (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date         NOT NULL,
  category      text         NOT NULL,
  total_jobs    integer      NOT NULL DEFAULT 0,
  avg_salary_min integer,
  avg_salary_max integer,
  top_skills    text[],
  metadata      jsonb,
  created_at    timestamptz  NOT NULL DEFAULT now(),

  UNIQUE (snapshot_date, category)
);

ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;

-- Service-role bypass; all other reads require an authenticated session.
CREATE POLICY "market_snapshots_read"
  ON market_snapshots FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "market_snapshots_service_write"
  ON market_snapshots FOR ALL
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- admin_config
-- Key/value store for admin-controlled runtime configuration.
-- Only service-role may write; authenticated users may read non-sensitive keys.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_config (
  key         text         PRIMARY KEY,
  value       jsonb        NOT NULL,
  description text,
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  updated_by  uuid         REFERENCES auth.users (id) ON DELETE SET NULL
);

ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_config_read"
  ON admin_config FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "admin_config_service_write"
  ON admin_config FOR ALL
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- signal_classifications
-- Classification rules for job-relevance signals consumed by the scoring
-- engine.  Each row maps a signal_type to a classification label and weight.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signal_classifications (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type   text         NOT NULL,
  classification text        NOT NULL,
  weight        numeric(5,4) NOT NULL DEFAULT 1.0,
  active        boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),

  UNIQUE (signal_type, classification)
);

ALTER TABLE signal_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signal_classifications_read"
  ON signal_classifications FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "signal_classifications_service_write"
  ON signal_classifications FOR ALL
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- cache_invalidation_log
-- Audit trail for cache invalidation events triggered by the system, admin
-- actions, or automated jobs.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key       text         NOT NULL,
  invalidated_by  text         NOT NULL,   -- 'system' | 'admin' | 'scheduled_job'
  reason          text,
  invalidated_at  timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE cache_invalidation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cache_invalidation_log_service_write"
  ON cache_invalidation_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "cache_invalidation_log_read"
  ON cache_invalidation_log FOR SELECT
  USING (auth.role() = 'service_role');
