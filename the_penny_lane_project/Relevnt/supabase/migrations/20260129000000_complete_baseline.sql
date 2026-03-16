-- ============================================================
-- Relevnt — Complete Baseline Schema
-- Migration: 20260129000000_complete_baseline.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL UNIQUE,
  display_name   TEXT,
  avatar_url     TEXT,
  job_alerts_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- job_listings
-- ============================================================
CREATE TABLE IF NOT EXISTS job_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  company         TEXT NOT NULL,
  location        TEXT,
  remote          BOOLEAN NOT NULL DEFAULT false,
  salary_min      INTEGER,
  salary_max      INTEGER,
  skills_required TEXT[],
  description     TEXT,
  url             TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
  posted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT job_listings_status_check CHECK (status IN ('open', 'closed', 'expired'))
);

-- ============================================================
-- applications
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_listing_id  UUID REFERENCES job_listings(id) ON DELETE SET NULL,
  company_name    TEXT NOT NULL,
  role            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'applied',
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location        TEXT,
  salary          TEXT,
  notes           TEXT,
  url             TEXT,
  CONSTRAINT applications_status_check CHECK (
    status IN ('applied','reviewing','interviewing','in_review','offer','accepted','rejected')
  )
);

-- ============================================================
-- auto_apply_queue
-- ============================================================
-- Tracks jobs queued for automated application submission.
-- NOTE: This baseline only allows the initial set of processing statuses.
--       See migration 20260131005000_medium_priority_bugs_fix.sql for
--       additional status values ('paused','retry_scheduled','expired')
--       introduced to support pausing and retry logic. The CHECK constraint
--       was not updated in that migration — see
--       20260316000000_fix_auto_apply_queue_status_constraint.sql for the fix.
CREATE TABLE IF NOT EXISTS auto_apply_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_listing_id   UUID REFERENCES job_listings(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  retry_count      INTEGER NOT NULL DEFAULT 0,
  error_message    TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at     TIMESTAMPTZ,
  CONSTRAINT auto_apply_queue_status_check CHECK (
    status IN ('pending','processing','completed','failed','cancelled')
  )
);

-- ============================================================
-- email_queue
-- ============================================================
CREATE TABLE IF NOT EXISTS email_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_email    TEXT NOT NULL,
  template    TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  sent_at     TIMESTAMPTZ,
  failed_at   TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- user_profiles (for scoring/matching)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  skills      TEXT[],
  resume_text TEXT,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_applications_user_id         ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status          ON applications(status);
CREATE INDEX IF NOT EXISTS idx_auto_apply_queue_user_id     ON auto_apply_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_apply_queue_status      ON auto_apply_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_listings_status          ON job_listings(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_to_user_id       ON email_queue(to_user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_sent_at          ON email_queue(sent_at);

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_apply_queue  ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles     ENABLE ROW LEVEL SECURITY;

-- Users: read/write own row only
CREATE POLICY users_own_row ON users
  USING (id = auth.uid());

-- Applications: users manage their own applications
CREATE POLICY applications_own ON applications
  USING (user_id = auth.uid());

-- Auto-apply queue: users manage their own queue items
CREATE POLICY auto_apply_queue_own ON auto_apply_queue
  USING (user_id = auth.uid());

-- Email queue: users read their own email records
CREATE POLICY email_queue_own ON email_queue
  FOR SELECT
  USING (to_user_id = auth.uid());

-- User profiles: users manage their own profile
CREATE POLICY user_profiles_own ON user_profiles
  USING (user_id = auth.uid());
