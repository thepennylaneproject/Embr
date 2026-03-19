-- ============================================================
-- Migration: add_music_monetary_check_constraints
-- Purpose:   Add CHECK constraints to Track.price and
--            ArtistStat.revenue to enforce non-negative integer
--            cents values, consistent with the constraints
--            already applied to Wallet, Transaction, Tip, and
--            Payout in migration 20260317000000.
--
-- Both fields were converted from float USD to integer cents in
-- migration 20260310101500_normalize_music_money_cents.
-- ============================================================

-- ── Track ─────────────────────────────────────────────────────
-- price = 0 means free; any positive integer represents cents.
-- Negative prices are never valid.
ALTER TABLE "Track"
  ADD CONSTRAINT "Track_price_non_negative" CHECK ("price" >= 0);

-- ── ArtistStat ────────────────────────────────────────────────
-- Revenue is cumulative earned cents; cannot be negative.
ALTER TABLE "ArtistStat"
  ADD CONSTRAINT "ArtistStat_revenue_non_negative" CHECK ("revenue" >= 0);
