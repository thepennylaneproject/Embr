-- ============================================================
-- Migration: add_rls_policies
-- Purpose:   Enable Row-Level Security (RLS) on all tables.
--            Introduces the `embr_app` least-privilege role used
--            by the NestJS API. Superuser `embr` retains full
--            access and is used only for migrations/seeds.
--
-- Context variables (set before each query by PrismaService):
--   app.current_user_id  – authenticated user's UUID (TEXT)
--   app.bypass_rls       – 'on' for service/admin operations
-- ============================================================

-- ── Create auth schema for helper functions ──────────────────
CREATE SCHEMA IF NOT EXISTS auth;

-- ── Create app role ───────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'embr_app') THEN
    CREATE ROLE embr_app WITH LOGIN PASSWORD 'embr_app_dev_password';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE embr TO embr_app;
GRANT USAGE ON SCHEMA public TO embr_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO embr_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO embr_app;

-- Ensure future tables also grant access
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO embr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO embr_app;

-- ── Helper: current user ID from session context ──────────────
-- Returns the current user's ID from the session variable, or NULL.
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')
$$;

-- ── Helper: service bypass check ─────────────────────────────
CREATE OR REPLACE FUNCTION auth.is_service_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.bypass_rls', true) = 'on'
$$;

-- ============================================================
-- MACRO: For each table we:
--   1. ENABLE ROW LEVEL SECURITY (table-owner bypass is default;
--      the embr_app role is NOT the owner, so RLS always applies)
--   2. Add a PERMISSIVE service-bypass policy (checked first)
--   3. Add user-specific access policies
-- ============================================================

-- ── User ─────────────────────────────────────────────────────
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_service_bypass" ON "User"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- All authenticated users can read basic user records (needed for lookups)
CREATE POLICY "user_authenticated_select" ON "User"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (auth.current_user_id() IS NOT NULL);

-- Only owner can update their record
CREATE POLICY "user_owner_update" ON "User"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING (id = auth.current_user_id())
  WITH CHECK (id = auth.current_user_id());

-- ── Profile ───────────────────────────────────────────────────
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_service_bypass" ON "Profile"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Public profiles are readable by everyone (including unauthenticated)
CREATE POLICY "profile_public_select" ON "Profile"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("isPrivate" = false);

-- Private profiles readable only by owner
CREATE POLICY "profile_private_owner_select" ON "Profile"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    "isPrivate" = true
    AND "userId" = auth.current_user_id()
  );

-- Only owner can insert / update their profile
CREATE POLICY "profile_owner_write" ON "Profile"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("userId" = auth.current_user_id());

CREATE POLICY "profile_owner_update" ON "Profile"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("userId" = auth.current_user_id())
  WITH CHECK ("userId" = auth.current_user_id());

CREATE POLICY "profile_owner_delete" ON "Profile"
  AS PERMISSIVE FOR DELETE TO PUBLIC
  USING ("userId" = auth.current_user_id());

-- ── Follow ────────────────────────────────────────────────────
ALTER TABLE "Follow" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follow_service_bypass" ON "Follow"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Everyone can read follow relationships
CREATE POLICY "follow_public_select" ON "Follow"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (true);

-- Only the follower manages their own follows
CREATE POLICY "follow_owner_insert" ON "Follow"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("followerId" = auth.current_user_id());

CREATE POLICY "follow_owner_delete" ON "Follow"
  AS PERMISSIVE FOR DELETE TO PUBLIC
  USING ("followerId" = auth.current_user_id());

-- ── RefreshToken ──────────────────────────────────────────────
ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refresh_token_service_bypass" ON "RefreshToken"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Token owner can manage their own tokens
CREATE POLICY "refresh_token_owner_access" ON "RefreshToken"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING ("userId" = auth.current_user_id())
  WITH CHECK ("userId" = auth.current_user_id());

-- ── PasswordResetToken ────────────────────────────────────────
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pwd_reset_service_bypass" ON "PasswordResetToken"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "pwd_reset_owner_access" ON "PasswordResetToken"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING ("userId" = auth.current_user_id())
  WITH CHECK ("userId" = auth.current_user_id());

-- ── EmailVerificationToken ────────────────────────────────────
ALTER TABLE "EmailVerificationToken" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_verify_service_bypass" ON "EmailVerificationToken"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "email_verify_owner_access" ON "EmailVerificationToken"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING ("userId" = auth.current_user_id())
  WITH CHECK ("userId" = auth.current_user_id());

-- ── Post ──────────────────────────────────────────────────────
ALTER TABLE "Post" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_service_bypass" ON "Post"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Public posts are visible to everyone
CREATE POLICY "post_public_select" ON "Post"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    visibility = 'PUBLIC'
    AND "deletedAt" IS NULL
  );

-- Followers-only posts: owner or any authenticated user (feed filters in app layer)
CREATE POLICY "post_followers_select" ON "Post"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    visibility = 'FOLLOWERS'
    AND "deletedAt" IS NULL
    AND auth.current_user_id() IS NOT NULL
  );

-- Private posts: owner only
CREATE POLICY "post_private_owner_select" ON "Post"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    (visibility = 'PRIVATE' OR "deletedAt" IS NOT NULL)
    AND "authorId" = auth.current_user_id()
  );

-- Author manages their own posts
CREATE POLICY "post_author_insert" ON "Post"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("authorId" = auth.current_user_id());

CREATE POLICY "post_author_update" ON "Post"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("authorId" = auth.current_user_id())
  WITH CHECK ("authorId" = auth.current_user_id());

CREATE POLICY "post_author_delete" ON "Post"
  AS PERMISSIVE FOR DELETE TO PUBLIC
  USING ("authorId" = auth.current_user_id());

-- ── ScheduledPost ─────────────────────────────────────────────
ALTER TABLE "ScheduledPost" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_post_service_bypass" ON "ScheduledPost"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "scheduled_post_owner_access" ON "ScheduledPost"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING ("authorId" = auth.current_user_id())
  WITH CHECK ("authorId" = auth.current_user_id());

-- ── Comment ───────────────────────────────────────────────────
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_service_bypass" ON "Comment"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Comments on public posts are readable by all
CREATE POLICY "comment_public_select" ON "Comment"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("deletedAt" IS NULL);

-- Any authenticated user can comment
CREATE POLICY "comment_authenticated_insert" ON "Comment"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "authorId" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

-- Only author can edit/delete
CREATE POLICY "comment_author_update" ON "Comment"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("authorId" = auth.current_user_id())
  WITH CHECK ("authorId" = auth.current_user_id());

CREATE POLICY "comment_author_delete" ON "Comment"
  AS PERMISSIVE FOR DELETE TO PUBLIC
  USING ("authorId" = auth.current_user_id());

-- ── Like ──────────────────────────────────────────────────────
ALTER TABLE "Like" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "like_service_bypass" ON "Like"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "like_public_select" ON "Like"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (true);

CREATE POLICY "like_owner_insert" ON "Like"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "userId" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

CREATE POLICY "like_owner_delete" ON "Like"
  AS PERMISSIVE FOR DELETE TO PUBLIC
  USING ("userId" = auth.current_user_id());

-- ── Wallet ────────────────────────────────────────────────────
ALTER TABLE "Wallet" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_service_bypass" ON "Wallet"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "wallet_owner_access" ON "Wallet"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING ("userId" = auth.current_user_id())
  WITH CHECK ("userId" = auth.current_user_id());

-- ── Transaction ───────────────────────────────────────────────
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transaction_service_bypass" ON "Transaction"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Owner sees their own transactions (via walletId relationship)
CREATE POLICY "transaction_owner_select" ON "Transaction"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    "userId" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

-- ── Tip ───────────────────────────────────────────────────────
ALTER TABLE "Tip" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tip_service_bypass" ON "Tip"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Sender or recipient can view tips
CREATE POLICY "tip_parties_select" ON "Tip"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "senderId" = auth.current_user_id()
      OR "recipientId" = auth.current_user_id()
    )
  );

-- ── Payout ────────────────────────────────────────────────────
ALTER TABLE "Payout" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payout_service_bypass" ON "Payout"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "payout_owner_select" ON "Payout"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    "userId" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

-- Only owner can request a payout (INSERT)
CREATE POLICY "payout_owner_insert" ON "Payout"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("userId" = auth.current_user_id());

-- ── Gig ───────────────────────────────────────────────────────
ALTER TABLE "Gig" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gig_service_bypass" ON "Gig"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Open/active gigs are publicly visible
CREATE POLICY "gig_public_select" ON "Gig"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    "deletedAt" IS NULL
    AND status NOT IN ('CANCELLED', 'COMPLETED')
  );

-- Owner can see their own gigs regardless of status
CREATE POLICY "gig_owner_select" ON "Gig"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("creatorId" = auth.current_user_id());

-- Creator manages their own gigs
CREATE POLICY "gig_creator_insert" ON "Gig"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("creatorId" = auth.current_user_id());

CREATE POLICY "gig_creator_update" ON "Gig"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("creatorId" = auth.current_user_id())
  WITH CHECK ("creatorId" = auth.current_user_id());

CREATE POLICY "gig_creator_delete" ON "Gig"
  AS PERMISSIVE FOR DELETE TO PUBLIC
  USING ("creatorId" = auth.current_user_id());

-- ── Application ───────────────────────────────────────────────
ALTER TABLE "Application" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "application_service_bypass" ON "Application"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Applicant sees their own applications; gig owner sees applications to their gigs
CREATE POLICY "application_parties_select" ON "Application"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "applicantId" = auth.current_user_id()
      OR EXISTS (
        SELECT 1 FROM "Gig" g
        WHERE g.id = "gigId"
          AND g."creatorId" = auth.current_user_id()
      )
    )
  );

-- Only applicant can submit
CREATE POLICY "application_applicant_insert" ON "Application"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("applicantId" = auth.current_user_id());

-- Applicant or gig owner can update (e.g., status changes)
CREATE POLICY "application_parties_update" ON "Application"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING (
    "applicantId" = auth.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "Gig" g
      WHERE g.id = "gigId"
        AND g."creatorId" = auth.current_user_id()
    )
  );

-- ── GigMilestone ──────────────────────────────────────────────
ALTER TABLE "GigMilestone" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gig_milestone_service_bypass" ON "GigMilestone"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "gig_milestone_parties_access" ON "GigMilestone"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "Application" a
      JOIN "Gig" g ON g.id = a."gigId"
      WHERE a.id = "applicationId"
        AND (a."applicantId" = auth.current_user_id()
             OR g."creatorId" = auth.current_user_id())
    )
  )
  WITH CHECK (
    auth.current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "Application" a
      JOIN "Gig" g ON g.id = a."gigId"
      WHERE a.id = "applicationId"
        AND (a."applicantId" = auth.current_user_id()
             OR g."creatorId" = auth.current_user_id())
    )
  );

-- ── Escrow ────────────────────────────────────────────────────
ALTER TABLE "Escrow" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escrow_service_bypass" ON "Escrow"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "escrow_parties_select" ON "Escrow"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "payerId" = auth.current_user_id()
      OR "payeeId" = auth.current_user_id()
    )
  );

-- ── Dispute ───────────────────────────────────────────────────
ALTER TABLE "Dispute" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispute_service_bypass" ON "Dispute"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "dispute_parties_select" ON "Dispute"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "raisedBy" = auth.current_user_id()
      OR "against" = auth.current_user_id()
    )
  );

CREATE POLICY "dispute_raiser_insert" ON "Dispute"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("raisedBy" = auth.current_user_id());

-- ── GigReview ─────────────────────────────────────────────────
ALTER TABLE "GigReview" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gig_review_service_bypass" ON "GigReview"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "gig_review_public_select" ON "GigReview"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (true);

CREATE POLICY "gig_review_reviewer_insert" ON "GigReview"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("reviewerId" = auth.current_user_id());

-- ── Job ───────────────────────────────────────────────────────
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_service_bypass" ON "Job"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Jobs are publicly readable (imported from external source)
CREATE POLICY "job_public_select" ON "Job"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (true);

-- ── JobApplication ────────────────────────────────────────────
ALTER TABLE "JobApplication" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_app_service_bypass" ON "JobApplication"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "job_app_owner_access" ON "JobApplication"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING ("userId" = auth.current_user_id())
  WITH CHECK ("userId" = auth.current_user_id());

-- ── Conversation ──────────────────────────────────────────────
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_service_bypass" ON "Conversation"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "conversation_participant_access" ON "Conversation"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "participant1Id" = auth.current_user_id()
      OR "participant2Id" = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.current_user_id() IS NOT NULL
    AND (
      "participant1Id" = auth.current_user_id()
      OR "participant2Id" = auth.current_user_id()
    )
  );

-- ── Message ───────────────────────────────────────────────────
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_service_bypass" ON "Message"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "message_participant_select" ON "Message"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "Conversation" c
      WHERE c.id = "conversationId"
        AND (c."participant1Id" = auth.current_user_id()
             OR c."participant2Id" = auth.current_user_id())
    )
  );

CREATE POLICY "message_sender_insert" ON "Message"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "senderId" = auth.current_user_id()
    AND EXISTS (
      SELECT 1 FROM "Conversation" c
      WHERE c.id = "conversationId"
        AND (c."participant1Id" = auth.current_user_id()
             OR c."participant2Id" = auth.current_user_id())
    )
  );

CREATE POLICY "message_sender_update" ON "Message"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("senderId" = auth.current_user_id())
  WITH CHECK ("senderId" = auth.current_user_id());

-- ── Notification ──────────────────────────────────────────────
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_service_bypass" ON "Notification"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "notification_recipient_access" ON "Notification"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING ("userId" = auth.current_user_id())
  WITH CHECK ("userId" = auth.current_user_id());

-- ── Report ────────────────────────────────────────────────────
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_service_bypass" ON "Report"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Reporter can see their own reports; reported user can see reports about them
CREATE POLICY "report_parties_select" ON "Report"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "reporterId" = auth.current_user_id()
      OR "reportedUserId" = auth.current_user_id()
    )
  );

-- Any authenticated user can file a report
CREATE POLICY "report_authenticated_insert" ON "Report"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "reporterId" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

-- ── ModerationAction ──────────────────────────────────────────
ALTER TABLE "ModerationAction" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mod_action_service_bypass" ON "ModerationAction"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Target user can view actions against them
CREATE POLICY "mod_action_target_select" ON "ModerationAction"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("userId" = auth.current_user_id());

-- ── Appeal ────────────────────────────────────────────────────
ALTER TABLE "Appeal" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appeal_service_bypass" ON "Appeal"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "appeal_user_access" ON "Appeal"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING ("userId" = auth.current_user_id())
  WITH CHECK ("userId" = auth.current_user_id());

-- ── AnalyticsEvent ────────────────────────────────────────────
ALTER TABLE "AnalyticsEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_service_bypass" ON "AnalyticsEvent"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Users can read their own events (e.g., for privacy export)
CREATE POLICY "analytics_owner_select" ON "AnalyticsEvent"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    "userId" IS NOT NULL
    AND "userId" = auth.current_user_id()
  );

-- Any authenticated or anonymous action can be recorded
CREATE POLICY "analytics_insert" ON "AnalyticsEvent"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "userId" IS NULL
    OR "userId" = auth.current_user_id()
  );

-- ── Media ─────────────────────────────────────────────────────
ALTER TABLE "Media" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_service_bypass" ON "Media"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "media_owner_access" ON "Media"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING ("userId" = auth.current_user_id())
  WITH CHECK ("userId" = auth.current_user_id());

-- ── WebhookEvent ──────────────────────────────────────────────
ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_event_service_bypass" ON "WebhookEvent"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- ── BlockedUser ───────────────────────────────────────────────
ALTER TABLE "BlockedUser" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_user_service_bypass" ON "BlockedUser"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "blocked_user_blocker_access" ON "BlockedUser"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING ("blockerId" = auth.current_user_id())
  WITH CHECK ("blockerId" = auth.current_user_id());

-- ── MutedUser ─────────────────────────────────────────────────
ALTER TABLE "MutedUser" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "muted_user_service_bypass" ON "MutedUser"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "muted_user_muter_access" ON "MutedUser"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING ("muterId" = auth.current_user_id())
  WITH CHECK ("muterId" = auth.current_user_id());

-- ── MutedKeyword ──────────────────────────────────────────────
ALTER TABLE "MutedKeyword" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "muted_keyword_service_bypass" ON "MutedKeyword"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "muted_keyword_owner_access" ON "MutedKeyword"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING ("userId" = auth.current_user_id())
  WITH CHECK ("userId" = auth.current_user_id());

-- ── FilterLog ─────────────────────────────────────────────────
ALTER TABLE "FilterLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "filter_log_service_bypass" ON "FilterLog"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Users can read their own filter logs
CREATE POLICY "filter_log_owner_select" ON "FilterLog"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("userId" = auth.current_user_id());

-- ── ContentRule ───────────────────────────────────────────────
ALTER TABLE "ContentRule" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_rule_service_bypass" ON "ContentRule"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Content rules are publicly readable (needed for filter evaluation)
CREATE POLICY "content_rule_public_select" ON "ContentRule"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (true);

-- ── Artist ────────────────────────────────────────────────────
ALTER TABLE "Artist" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_service_bypass" ON "Artist"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "artist_public_select" ON "Artist"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (true);

CREATE POLICY "artist_owner_write" ON "Artist"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("userId" = auth.current_user_id());

CREATE POLICY "artist_owner_update" ON "Artist"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("userId" = auth.current_user_id())
  WITH CHECK ("userId" = auth.current_user_id());

-- ── Album ─────────────────────────────────────────────────────
ALTER TABLE "Album" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "album_service_bypass" ON "Album"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "album_published_select" ON "Album"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("isPublished" = true);

CREATE POLICY "album_owner_select" ON "Album"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM "Artist" a
      WHERE a.id = "artistId"
        AND a."userId" = auth.current_user_id()
    )
  );

CREATE POLICY "album_artist_write" ON "Album"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Artist" a
      WHERE a.id = "artistId"
        AND a."userId" = auth.current_user_id()
    )
  );

CREATE POLICY "album_artist_update" ON "Album"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM "Artist" a
      WHERE a.id = "artistId"
        AND a."userId" = auth.current_user_id()
    )
  );

-- ── Track ─────────────────────────────────────────────────────
ALTER TABLE "Track" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "track_service_bypass" ON "Track"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "track_public_select" ON "Track"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    "isPublished" = true
    AND visibility = 'public'
    AND "deletedAt" IS NULL
  );

-- Authenticated users can see followers-only tracks
CREATE POLICY "track_followers_select" ON "Track"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    "isPublished" = true
    AND visibility = 'followers'
    AND "deletedAt" IS NULL
    AND auth.current_user_id() IS NOT NULL
  );

-- Artist sees all their own tracks
CREATE POLICY "track_artist_select" ON "Track"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM "Artist" a
      WHERE a.id = "artistId"
        AND a."userId" = auth.current_user_id()
    )
  );

CREATE POLICY "track_artist_write" ON "Track"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Artist" a
      WHERE a.id = "artistId"
        AND a."userId" = auth.current_user_id()
    )
  );

CREATE POLICY "track_artist_update" ON "Track"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM "Artist" a
      WHERE a.id = "artistId"
        AND a."userId" = auth.current_user_id()
    )
  );

-- ── TrackPlay ─────────────────────────────────────────────────
ALTER TABLE "TrackPlay" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "track_play_service_bypass" ON "TrackPlay"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Any user (including anonymous) can insert a play event
CREATE POLICY "track_play_insert" ON "TrackPlay"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "userId" IS NULL
    OR "userId" = auth.current_user_id()
  );

-- Artist can see plays on their tracks for analytics
CREATE POLICY "track_play_artist_select" ON "TrackPlay"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM "Track" t
      JOIN "Artist" a ON a.id = t."artistId"
      WHERE t.id = "trackId"
        AND a."userId" = auth.current_user_id()
    )
  );

-- ── TrackLike ─────────────────────────────────────────────────
ALTER TABLE "TrackLike" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "track_like_service_bypass" ON "TrackLike"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "track_like_public_select" ON "TrackLike"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (true);

CREATE POLICY "track_like_owner_write" ON "TrackLike"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "userId" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

CREATE POLICY "track_like_owner_delete" ON "TrackLike"
  AS PERMISSIVE FOR DELETE TO PUBLIC
  USING ("userId" = auth.current_user_id());

-- ── TrackComment ──────────────────────────────────────────────
ALTER TABLE "TrackComment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "track_comment_service_bypass" ON "TrackComment"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "track_comment_public_select" ON "TrackComment"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("deletedAt" IS NULL);

CREATE POLICY "track_comment_author_write" ON "TrackComment"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "userId" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

CREATE POLICY "track_comment_author_update" ON "TrackComment"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("userId" = auth.current_user_id());

CREATE POLICY "track_comment_author_delete" ON "TrackComment"
  AS PERMISSIVE FOR DELETE TO PUBLIC
  USING ("userId" = auth.current_user_id());

-- ── MusicPlaylist ─────────────────────────────────────────────
ALTER TABLE "MusicPlaylist" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "music_playlist_service_bypass" ON "MusicPlaylist"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "music_playlist_public_select" ON "MusicPlaylist"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("isPublished" = true);

CREATE POLICY "music_playlist_owner_select" ON "MusicPlaylist"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM "Artist" a
      WHERE a.id = "creatorId"
        AND a."userId" = auth.current_user_id()
    )
  );

CREATE POLICY "music_playlist_artist_write" ON "MusicPlaylist"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Artist" a
      WHERE a.id = "creatorId"
        AND a."userId" = auth.current_user_id()
    )
  );

CREATE POLICY "music_playlist_artist_update" ON "MusicPlaylist"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM "Artist" a
      WHERE a.id = "creatorId"
        AND a."userId" = auth.current_user_id()
    )
  );

-- ── ArtistStat ────────────────────────────────────────────────
ALTER TABLE "ArtistStat" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_stat_service_bypass" ON "ArtistStat"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "artist_stat_owner_select" ON "ArtistStat"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM "Artist" a
      WHERE a.id = "artistId"
        AND a."userId" = auth.current_user_id()
    )
  );

-- ── VideoUsage ────────────────────────────────────────────────
ALTER TABLE "VideoUsage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_usage_service_bypass" ON "VideoUsage"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "video_usage_parties_select" ON "VideoUsage"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "creatorId" = auth.current_user_id()
      OR EXISTS (
        SELECT 1 FROM "Track" t
        JOIN "Artist" a ON a.id = t."artistId"
        WHERE t.id = "trackId"
          AND a."userId" = auth.current_user_id()
      )
    )
  );

-- ── Group ─────────────────────────────────────────────────────
ALTER TABLE "Group" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_service_bypass" ON "Group"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Public and private groups are discoverable; secret groups are hidden unless member
CREATE POLICY "group_public_select" ON "Group"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    type IN ('PUBLIC', 'PRIVATE')
    AND "deletedAt" IS NULL
  );

-- Secret group: only members can see it
CREATE POLICY "group_secret_member_select" ON "Group"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    type = 'SECRET'
    AND "deletedAt" IS NULL
    AND auth.current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "GroupMember" gm
      WHERE gm."groupId" = id
        AND gm."userId" = auth.current_user_id()
    )
  );

-- Creator can always see their own group (even if secret, before they join as member)
CREATE POLICY "group_creator_select" ON "Group"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("createdById" = auth.current_user_id());

CREATE POLICY "group_authenticated_insert" ON "Group"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "createdById" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

CREATE POLICY "group_admin_update" ON "Group"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING (
    "createdById" = auth.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "GroupMember" gm
      WHERE gm."groupId" = id
        AND gm."userId" = auth.current_user_id()
        AND gm.role = 'ADMIN'
    )
  );

-- ── GroupMember ───────────────────────────────────────────────
ALTER TABLE "GroupMember" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_member_service_bypass" ON "GroupMember"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Group members can see other members
CREATE POLICY "group_member_select" ON "GroupMember"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "GroupMember" gm2
      WHERE gm2."groupId" = "groupId"
        AND gm2."userId" = auth.current_user_id()
    )
  );

-- Users can join (insert their own membership); group admin manages others
CREATE POLICY "group_member_self_insert" ON "GroupMember"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "userId" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

-- Users can leave; group admin can remove members
CREATE POLICY "group_member_delete" ON "GroupMember"
  AS PERMISSIVE FOR DELETE TO PUBLIC
  USING (
    "userId" = auth.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "GroupMember" gm2
      WHERE gm2."groupId" = "groupId"
        AND gm2."userId" = auth.current_user_id()
        AND gm2.role IN ('MODERATOR', 'ADMIN')
    )
  );

-- ── GroupJoinRequest ──────────────────────────────────────────
ALTER TABLE "GroupJoinRequest" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_join_req_service_bypass" ON "GroupJoinRequest"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "group_join_req_parties_select" ON "GroupJoinRequest"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "userId" = auth.current_user_id()
      OR EXISTS (
        SELECT 1 FROM "GroupMember" gm
        WHERE gm."groupId" = "groupId"
          AND gm."userId" = auth.current_user_id()
          AND gm.role IN ('MODERATOR', 'ADMIN')
      )
    )
  );

CREATE POLICY "group_join_req_user_insert" ON "GroupJoinRequest"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("userId" = auth.current_user_id());

-- ── GroupInvite ───────────────────────────────────────────────
ALTER TABLE "GroupInvite" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_invite_service_bypass" ON "GroupInvite"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "group_invite_parties_select" ON "GroupInvite"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "inviterId" = auth.current_user_id()
      OR "inviteeId" = auth.current_user_id()
    )
  );

CREATE POLICY "group_invite_member_insert" ON "GroupInvite"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("inviterId" = auth.current_user_id());

-- ── MutualAidPost ─────────────────────────────────────────────
ALTER TABLE "MutualAidPost" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mutual_aid_post_service_bypass" ON "MutualAidPost"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "mutual_aid_post_public_select" ON "MutualAidPost"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("deletedAt" IS NULL);

CREATE POLICY "mutual_aid_post_author_write" ON "MutualAidPost"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "authorId" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

CREATE POLICY "mutual_aid_post_author_update" ON "MutualAidPost"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("authorId" = auth.current_user_id());

-- ── MutualAidResponse ─────────────────────────────────────────
ALTER TABLE "MutualAidResponse" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mutual_aid_resp_service_bypass" ON "MutualAidResponse"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "mutual_aid_resp_parties_select" ON "MutualAidResponse"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "responderId" = auth.current_user_id()
      OR EXISTS (
        SELECT 1 FROM "MutualAidPost" m
        WHERE m.id = "postId"
          AND m."authorId" = auth.current_user_id()
      )
    )
  );

CREATE POLICY "mutual_aid_resp_responder_insert" ON "MutualAidResponse"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "responderId" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

-- ── MarketplaceListing ────────────────────────────────────────
ALTER TABLE "MarketplaceListing" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_service_bypass" ON "MarketplaceListing"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "listing_public_select" ON "MarketplaceListing"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    status = 'ACTIVE'
    AND "deletedAt" IS NULL
  );

CREATE POLICY "listing_seller_select" ON "MarketplaceListing"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("sellerId" = auth.current_user_id());

CREATE POLICY "listing_seller_write" ON "MarketplaceListing"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("sellerId" = auth.current_user_id());

CREATE POLICY "listing_seller_update" ON "MarketplaceListing"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("sellerId" = auth.current_user_id());

-- ── MarketplaceOrder ──────────────────────────────────────────
ALTER TABLE "MarketplaceOrder" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_service_bypass" ON "MarketplaceOrder"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "order_parties_select" ON "MarketplaceOrder"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "buyerId" = auth.current_user_id()
      OR "sellerId" = auth.current_user_id()
    )
  );

CREATE POLICY "order_buyer_insert" ON "MarketplaceOrder"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("buyerId" = auth.current_user_id());

-- ── MarketplaceReview ─────────────────────────────────────────
ALTER TABLE "MarketplaceReview" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mkt_review_service_bypass" ON "MarketplaceReview"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "mkt_review_public_select" ON "MarketplaceReview"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (true);

CREATE POLICY "mkt_review_reviewer_insert" ON "MarketplaceReview"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("reviewerId" = auth.current_user_id());

-- ── MarketplaceOffer ──────────────────────────────────────────
ALTER TABLE "MarketplaceOffer" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mkt_offer_service_bypass" ON "MarketplaceOffer"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "mkt_offer_parties_select" ON "MarketplaceOffer"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "buyerId" = auth.current_user_id()
      OR EXISTS (
        SELECT 1 FROM "MarketplaceListing" l
        WHERE l.id = "listingId"
          AND l."sellerId" = auth.current_user_id()
      )
    )
  );

CREATE POLICY "mkt_offer_buyer_insert" ON "MarketplaceOffer"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("buyerId" = auth.current_user_id());

-- ── Event ─────────────────────────────────────────────────────
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_service_bypass" ON "Event"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "event_public_select" ON "Event"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    status = 'PUBLISHED'
    AND "deletedAt" IS NULL
  );

CREATE POLICY "event_host_select" ON "Event"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("hostId" = auth.current_user_id());

CREATE POLICY "event_host_write" ON "Event"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("hostId" = auth.current_user_id());

CREATE POLICY "event_host_update" ON "Event"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("hostId" = auth.current_user_id());

-- ── EventAttendee ─────────────────────────────────────────────
ALTER TABLE "EventAttendee" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_attendee_service_bypass" ON "EventAttendee"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "event_attendee_participant_select" ON "EventAttendee"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND (
      "userId" = auth.current_user_id()
      OR EXISTS (
        SELECT 1 FROM "Event" e
        WHERE e.id = "eventId"
          AND e."hostId" = auth.current_user_id()
      )
    )
  );

CREATE POLICY "event_attendee_self_insert" ON "EventAttendee"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("userId" = auth.current_user_id());

CREATE POLICY "event_attendee_self_update" ON "EventAttendee"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("userId" = auth.current_user_id());

-- ── EventRecap ────────────────────────────────────────────────
ALTER TABLE "EventRecap" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_recap_service_bypass" ON "EventRecap"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "event_recap_public_select" ON "EventRecap"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (true);

CREATE POLICY "event_recap_host_write" ON "EventRecap"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Event" e
      WHERE e.id = "eventId"
        AND e."hostId" = auth.current_user_id()
    )
  );

-- ── ActionAlert ───────────────────────────────────────────────
ALTER TABLE "ActionAlert" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_alert_service_bypass" ON "ActionAlert"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "action_alert_public_select" ON "ActionAlert"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING ("isActive" = true);

CREATE POLICY "action_alert_author_write" ON "ActionAlert"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK ("authorId" = auth.current_user_id());

CREATE POLICY "action_alert_author_update" ON "ActionAlert"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("authorId" = auth.current_user_id());

-- ── Poll ──────────────────────────────────────────────────────
ALTER TABLE "Poll" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll_service_bypass" ON "Poll"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "poll_public_select" ON "Poll"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (true);

CREATE POLICY "poll_author_write" ON "Poll"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "authorId" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

CREATE POLICY "poll_author_update" ON "Poll"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING ("authorId" = auth.current_user_id());

-- ── PollOption ────────────────────────────────────────────────
ALTER TABLE "PollOption" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll_option_service_bypass" ON "PollOption"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY "poll_option_public_select" ON "PollOption"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (true);

-- Poll options managed by poll author (via service bypass or explicit)
CREATE POLICY "poll_option_author_write" ON "PollOption"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Poll" p
      WHERE p.id = "pollId"
        AND p."authorId" = auth.current_user_id()
    )
  );

-- ── PollVote ──────────────────────────────────────────────────
ALTER TABLE "PollVote" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll_vote_service_bypass" ON "PollVote"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Non-anonymous polls: everyone can see votes; anonymous: only owner sees own vote
CREATE POLICY "poll_vote_public_select" ON "PollVote"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    "userId" = auth.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "Poll" p
      WHERE p.id = "pollId"
        AND p."isAnonymous" = false
    )
  );

CREATE POLICY "poll_vote_owner_insert" ON "PollVote"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    "userId" = auth.current_user_id()
    AND auth.current_user_id() IS NOT NULL
  );

CREATE POLICY "poll_vote_owner_delete" ON "PollVote"
  AS PERMISSIVE FOR DELETE TO PUBLIC
  USING ("userId" = auth.current_user_id());

-- ── GroupTreasury ─────────────────────────────────────────────
ALTER TABLE "GroupTreasury" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_treasury_service_bypass" ON "GroupTreasury"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Group members can view treasury
CREATE POLICY "group_treasury_member_select" ON "GroupTreasury"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "GroupMember" gm
      WHERE gm."groupId" = "groupId"
        AND gm."userId" = auth.current_user_id()
    )
  );

-- ── GroupTreasuryTransaction ──────────────────────────────────
ALTER TABLE "GroupTreasuryTransaction" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasury_tx_service_bypass" ON "GroupTreasuryTransaction"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- Group members can view treasury transactions
CREATE POLICY "treasury_tx_member_select" ON "GroupTreasuryTransaction"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    auth.current_user_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "GroupTreasury" gt
      JOIN "GroupMember" gm ON gm."groupId" = gt."groupId"
      WHERE gt.id = "treasuryId"
        AND gm."userId" = auth.current_user_id()
    )
  );

-- Authenticated users can contribute
CREATE POLICY "treasury_tx_contributor_insert" ON "GroupTreasuryTransaction"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    auth.current_user_id() IS NOT NULL
    AND (
      "contributorId" IS NULL
      OR "contributorId" = auth.current_user_id()
    )
  );
