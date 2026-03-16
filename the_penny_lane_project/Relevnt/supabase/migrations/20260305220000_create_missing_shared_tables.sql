-- =============================================================
-- Migration: 20260305220000_create_missing_shared_tables
-- Purpose:   Create internal shared-state tables that were absent
--            from earlier migrations but are required by Netlify
--            background functions.  All tables are service-role-only:
--            end users have no direct access.
-- =============================================================

-- ── cache_invalidation_log ────────────────────────────────────
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key    TEXT        NOT NULL,
  reason       TEXT,
  invalidated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cache_invalidation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cache_invalidation_log_service_role" ON cache_invalidation_log
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── market_snapshots ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_snapshots (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload      JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_snapshots_service_role" ON market_snapshots
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── admin_config ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_config (
  key          TEXT        PRIMARY KEY,
  value        JSONB       NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_config_service_role" ON admin_config
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── signal_classifications ────────────────────────────────────
CREATE TABLE IF NOT EXISTS signal_classifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type  TEXT        NOT NULL,
  label        TEXT        NOT NULL,
  weight       REAL        NOT NULL DEFAULT 1.0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE signal_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signal_classifications_service_role" ON signal_classifications
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
