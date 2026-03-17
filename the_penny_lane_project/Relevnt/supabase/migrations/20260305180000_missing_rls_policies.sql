-- =============================================================
-- Migration: 20260305180000_missing_rls_policies
-- Purpose:   Enable RLS on auto_apply_queue and
--            resume_versions_history, which were created by an
--            earlier migration without Row Level Security.
--
-- Fixes: MISSING-RLS-001, MISSING-RLS-002
-- =============================================================

-- ── auto_apply_queue ─────────────────────────────────────────
ALTER TABLE auto_apply_queue ENABLE ROW LEVEL SECURITY;

-- Only the owning user may see or modify their own queue rows.
CREATE POLICY "auto_apply_queue_owner_all" ON auto_apply_queue
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role always bypasses RLS (used by Netlify functions).
CREATE POLICY "auto_apply_queue_service_role" ON auto_apply_queue
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── resume_versions_history ───────────────────────────────────
ALTER TABLE resume_versions_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resume_versions_owner_all" ON resume_versions_history
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "resume_versions_service_role" ON resume_versions_history
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
