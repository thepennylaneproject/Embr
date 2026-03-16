-- Backfill/repair wallet foreign keys introduced by earlier schema changes.
-- This migration is idempotent and safe to rerun.

-- Ensure wallets exist for users referenced by transactions/payouts.
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
  SELECT DISTINCT "userId" FROM "Transaction" WHERE "userId" IS NOT NULL
  UNION
  SELECT DISTINCT "userId" FROM "Payout" WHERE "userId" IS NOT NULL
) AS missing
LEFT JOIN "Wallet" w ON w."userId" = missing."userId"
WHERE w."id" IS NULL;

-- Backfill walletId for transactions based on userId.
UPDATE "Transaction" t
SET "walletId" = w."id"
FROM "Wallet" w
WHERE t."walletId" IS NULL
  AND t."userId" = w."userId";

-- Backfill walletId for payouts based on userId.
UPDATE "Payout" p
SET "walletId" = w."id"
FROM "Wallet" w
WHERE p."walletId" IS NULL
  AND p."userId" = w."userId";
