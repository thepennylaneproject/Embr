-- Enforce NOT NULL on walletId for Transaction and Payout tables.
-- The backfill migration (20260310103000) should have filled all NULL values,
-- but we repeat the backfill here defensively before adding the constraint.

-- Abort early if there are rows with NULL walletId AND NULL userId that cannot
-- be resolved. These orphaned rows must be remediated manually before this
-- migration can succeed.
DO $$
DECLARE
  orphaned_transactions INTEGER;
  orphaned_payouts      INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_transactions
    FROM "Transaction" WHERE "walletId" IS NULL AND "userId" IS NULL;
  SELECT COUNT(*) INTO orphaned_payouts
    FROM "Payout" WHERE "walletId" IS NULL AND "userId" IS NULL;

  IF orphaned_transactions > 0 OR orphaned_payouts > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce NOT NULL on walletId: % orphaned Transaction row(s) and % orphaned Payout row(s) have NULL walletId and NULL userId and cannot be auto-resolved. Remediate these rows manually before re-running this migration.',
      orphaned_transactions, orphaned_payouts;
  END IF;
END $$;

-- Ensure wallets exist for any users still referenced by nullable walletId rows.
-- ON CONFLICT DO NOTHING guards against duplicate-wallet races on concurrent runs.
INSERT INTO "Wallet" (
  "userId",
  "balance",
  "pendingBalance",
  "totalEarned",
  "totalWithdrawn",
  "currency",
  "createdAt",
  "updatedAt"
)
SELECT
  missing."userId",
  0,
  0,
  0,
  0,
  'USD',
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT "userId" FROM "Transaction" WHERE "userId" IS NOT NULL AND "walletId" IS NULL
  UNION
  SELECT DISTINCT "userId" FROM "Payout" WHERE "userId" IS NOT NULL AND "walletId" IS NULL
) AS missing
LEFT JOIN "Wallet" w ON w."userId" = missing."userId"
WHERE w."id" IS NULL
ON CONFLICT ("userId") DO NOTHING;

-- Backfill walletId for transactions where it is still NULL.
UPDATE "Transaction" t
SET "walletId" = w."id"
FROM "Wallet" w
WHERE t."walletId" IS NULL
  AND t."userId" = w."userId";

-- Backfill walletId for payouts where it is still NULL.
UPDATE "Payout" p
SET "walletId" = w."id"
FROM "Wallet" w
WHERE p."walletId" IS NULL
  AND p."userId" = w."userId";

-- Abort if any rows could not be backfilled (no matching wallet found).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Transaction" WHERE "walletId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on Transaction.walletId: rows with no resolvable wallet remain.';
  END IF;
  IF EXISTS (SELECT 1 FROM "Payout" WHERE "walletId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on Payout.walletId: rows with no resolvable wallet remain.';
  END IF;
END $$;

-- Enforce NOT NULL constraint on the walletId columns.
ALTER TABLE "Transaction" ALTER COLUMN "walletId" SET NOT NULL;
ALTER TABLE "Payout" ALTER COLUMN "walletId" SET NOT NULL;
