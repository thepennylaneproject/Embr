-- ============================================================
-- Relevnt — Medium Priority Bug Fixes
-- Migration: 20260131005000_medium_priority_bugs_fix.sql
-- ============================================================
-- This migration adds support for pausing auto-apply jobs and
-- scheduled retries, along with expiry tracking.
--
-- BUG: The new status values ('paused', 'retry_scheduled', 'expired')
-- introduced here are used by application logic but the CHECK constraint
-- on auto_apply_queue.status was NOT updated. Environments that applied
-- the baseline migration (20260129000000_complete_baseline.sql) will
-- reject any INSERT or UPDATE that sets status to one of these new values,
-- causing runtime write failures.
--
-- Fix: See migration 20260316000000_fix_auto_apply_queue_status_constraint.sql

-- Add columns to support pause/retry/expiry lifecycle
ALTER TABLE auto_apply_queue
  ADD COLUMN IF NOT EXISTS paused_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_retry_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_at          TIMESTAMPTZ;

-- Add max_retries configuration per queue item
ALTER TABLE auto_apply_queue
  ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 3;

-- Index to efficiently query items due for retry
CREATE INDEX IF NOT EXISTS idx_auto_apply_queue_scheduled_retry
  ON auto_apply_queue(scheduled_retry_at)
  WHERE status = 'retry_scheduled';

-- Index to efficiently query paused items
CREATE INDEX IF NOT EXISTS idx_auto_apply_queue_paused
  ON auto_apply_queue(paused_at)
  WHERE status = 'paused';

-- Extend job_listings to track expiry
ALTER TABLE job_listings
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_job_listings_expires_at
  ON job_listings(expires_at)
  WHERE status = 'open';

-- NOTE: The auto_apply_queue_status_check constraint inherited from
-- 20260129000000_complete_baseline.sql still only permits:
--   ('pending','processing','completed','failed','cancelled')
-- Inserting or updating a row with status IN
--   ('paused','retry_scheduled','expired')
-- will raise:
--   ERROR: new row for relation "auto_apply_queue" violates check constraint
--          "auto_apply_queue_status_check"
-- until 20260316000000_fix_auto_apply_queue_status_constraint.sql is applied.
