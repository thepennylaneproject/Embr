-- ============================================================
-- Migration: add_monetary_amount_check_constraints
-- Purpose:   Add CHECK constraints to ensure monetary amount
--            fields are never NULL and hold valid (non-negative
--            or strictly positive) values.
--
-- Affected models: Wallet, Transaction, Tip, Payout
-- All amounts are stored in integer cents.
-- ============================================================

-- ── Wallet ───────────────────────────────────────────────────
-- balance and pending/earned/withdrawn counters may be 0 but
-- must never be negative.
ALTER TABLE "Wallet"
  ADD CONSTRAINT "Wallet_balance_non_negative"        CHECK ("balance"         >= 0),
  ADD CONSTRAINT "Wallet_pendingBalance_non_negative"  CHECK ("pendingBalance"  >= 0),
  ADD CONSTRAINT "Wallet_totalEarned_non_negative"     CHECK ("totalEarned"     >= 0),
  ADD CONSTRAINT "Wallet_totalWithdrawn_non_negative"  CHECK ("totalWithdrawn"  >= 0);

-- ── Transaction ──────────────────────────────────────────────
-- amount must be strictly positive (absolute value, direction
-- is encoded by TransactionType).  fee and netAmount are
-- non-negative.
ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_amount_positive"      CHECK ("amount"    > 0),
  ADD CONSTRAINT "Transaction_fee_non_negative"     CHECK ("fee"       >= 0),
  ADD CONSTRAINT "Transaction_netAmount_non_negative" CHECK ("netAmount" >= 0);

-- ── Tip ──────────────────────────────────────────────────────
ALTER TABLE "Tip"
  ADD CONSTRAINT "Tip_amount_positive"        CHECK ("amount"    > 0),
  ADD CONSTRAINT "Tip_fee_non_negative"       CHECK ("fee"       >= 0),
  ADD CONSTRAINT "Tip_netAmount_non_negative" CHECK ("netAmount" >= 0);

-- ── Payout ───────────────────────────────────────────────────
ALTER TABLE "Payout"
  ADD CONSTRAINT "Payout_amount_positive"        CHECK ("amount"    > 0),
  ADD CONSTRAINT "Payout_fee_non_negative"       CHECK ("fee"       >= 0),
  ADD CONSTRAINT "Payout_netAmount_non_negative" CHECK ("netAmount" >= 0);
