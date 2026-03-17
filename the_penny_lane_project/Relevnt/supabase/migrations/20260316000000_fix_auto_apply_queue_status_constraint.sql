-- ============================================================
-- Relevnt — Fix auto_apply_queue status CHECK constraint
-- Migration: 20260316000000_fix_auto_apply_queue_status_constraint.sql
--
-- Background
-- ----------
-- The baseline migration (20260129000000_complete_baseline.sql) created
-- auto_apply_queue with a CHECK constraint that only permitted:
--   ('pending', 'processing', 'completed', 'failed', 'cancelled')
--
-- A later migration (20260131005000_medium_priority_bugs_fix.sql) added
-- columns and indexes to support three additional lifecycle states:
--   'paused'          — queue item paused by the user or system
--   'retry_scheduled' — failed item queued for a future retry attempt
--   'expired'         — item abandoned after max_retries exhausted or
--                       the associated job listing expired
--
-- However, that migration did NOT update the CHECK constraint.  Any
-- environment that applied the baseline before the bug-fix migration will
-- therefore raise a constraint-violation error at write time whenever
-- application code attempts to set status to one of the three new values.
--
-- Fix
-- ---
-- Drop the outdated constraint and recreate it with the full canonical set
-- of allowed values, covering both the original five and the three additions.
-- ============================================================

-- Step 1: Remove the outdated constraint.
ALTER TABLE auto_apply_queue
  DROP CONSTRAINT IF EXISTS auto_apply_queue_status_check;

-- Step 2: Recreate the constraint with the complete, canonical value set.
ALTER TABLE auto_apply_queue
  ADD CONSTRAINT auto_apply_queue_status_check CHECK (
    status IN (
      'pending',          -- item is waiting to be picked up by the processor
      'processing',       -- item is actively being submitted
      'completed',        -- submission succeeded
      'failed',           -- submission failed; may be retried
      'cancelled',        -- item was cancelled before processing
      'paused',           -- item is temporarily paused (added in 20260131005000)
      'retry_scheduled',  -- item will be retried at scheduled_retry_at (added in 20260131005000)
      'expired'           -- item will not be retried; max retries or listing expiry reached (added in 20260131005000)
    )
  );

-- Step 3: Verify no existing rows are left in an invalid state.
-- (This DO block is a safety guard; it raises an exception and rolls back
--  the migration if any row already holds an unrecognised status value.)
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM auto_apply_queue
  WHERE status NOT IN (
    'pending','processing','completed','failed','cancelled',
    'paused','retry_scheduled','expired'
  );

  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      'auto_apply_queue contains % row(s) with an unrecognised status value. '
      'Resolve those rows before applying this migration.',
      invalid_count;
  END IF;
END;
$$;
