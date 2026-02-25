-- Convert all monetary amounts from Decimal to Int (cents)
-- This migration multiplies existing Decimal values by 100 to convert to cents

-- Wallet table: Convert balance, pendingBalance, totalEarned, totalWithdrawn from Decimal to Int
ALTER TABLE "Wallet" ALTER COLUMN "balance" TYPE INTEGER USING CAST(ROUND("balance" * 100) AS INTEGER);
ALTER TABLE "Wallet" ALTER COLUMN "pendingBalance" TYPE INTEGER USING CAST(ROUND("pendingBalance" * 100) AS INTEGER);
ALTER TABLE "Wallet" ALTER COLUMN "totalEarned" TYPE INTEGER USING CAST(ROUND("totalEarned" * 100) AS INTEGER);
ALTER TABLE "Wallet" ALTER COLUMN "totalWithdrawn" TYPE INTEGER USING CAST(ROUND("totalWithdrawn" * 100) AS INTEGER);

-- Tip table: Convert amount from Decimal to Int
ALTER TABLE "Tip" ALTER COLUMN "amount" TYPE INTEGER USING CAST(ROUND("amount" * 100) AS INTEGER);

-- Transaction table: Convert amount from Decimal to Int
ALTER TABLE "Transaction" ALTER COLUMN "amount" TYPE INTEGER USING CAST(ROUND("amount" * 100) AS INTEGER);

-- Payout table: Convert amount from Decimal to Int
ALTER TABLE "Payout" ALTER COLUMN "amount" TYPE INTEGER USING CAST(ROUND("amount" * 100) AS INTEGER);

-- Add NOT NULL constraints and defaults
ALTER TABLE "Wallet" ALTER COLUMN "balance" SET DEFAULT 0;
ALTER TABLE "Wallet" ALTER COLUMN "pendingBalance" SET DEFAULT 0;
ALTER TABLE "Wallet" ALTER COLUMN "totalEarned" SET DEFAULT 0;
ALTER TABLE "Wallet" ALTER COLUMN "totalWithdrawn" SET DEFAULT 0;
