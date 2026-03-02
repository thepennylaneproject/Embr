/*
  Warnings:

  - You are about to alter the column `budgetMin` on the `Gig` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `budgetMax` on the `Gig` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `proposedBudget` on the `Application` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `amount` on the `GigMilestone` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `amount` on the `Escrow` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/

-- Convert Gig monetary amounts from Float to Int (cents)
ALTER TABLE "Gig" ALTER COLUMN "budgetMin" TYPE INTEGER USING CAST(ROUND("budgetMin" * 100) AS INTEGER);
ALTER TABLE "Gig" ALTER COLUMN "budgetMax" TYPE INTEGER USING CAST(ROUND("budgetMax" * 100) AS INTEGER);

-- Convert Application monetary amounts from Float to Int (cents)
ALTER TABLE "Application" ALTER COLUMN "proposedBudget" TYPE INTEGER USING CAST(ROUND("proposedBudget" * 100) AS INTEGER);

-- Convert GigMilestone monetary amounts from Float to Int (cents)
ALTER TABLE "GigMilestone" ALTER COLUMN "amount" TYPE INTEGER USING CAST(ROUND("amount" * 100) AS INTEGER);

-- Convert Escrow monetary amounts from Float to Int (cents)
ALTER TABLE "Escrow" ALTER COLUMN "amount" TYPE INTEGER USING CAST(ROUND("amount" * 100) AS INTEGER);


-- Add composite indexes for performance optimization
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt");
CREATE INDEX "Post_createdAt_visibility_idx" ON "Post"("createdAt", "visibility");
CREATE INDEX "Tip_senderId_createdAt_idx" ON "Tip"("senderId", "createdAt");
CREATE INDEX "Tip_recipientId_createdAt_idx" ON "Tip"("recipientId", "createdAt");
CREATE INDEX "Transaction_userId_type_createdAt_idx" ON "Transaction"("userId", "type", "createdAt");
CREATE INDEX "Payout_userId_status_createdAt_idx" ON "Payout"("userId", "status", "createdAt");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- Add check constraints to prevent negative monetary values
ALTER TABLE "Wallet" ADD CONSTRAINT wallet_balance_non_negative CHECK ("balance" >= 0);
ALTER TABLE "Wallet" ADD CONSTRAINT wallet_pending_balance_non_negative CHECK ("pendingBalance" >= 0);
ALTER TABLE "Wallet" ADD CONSTRAINT wallet_total_earned_non_negative CHECK ("totalEarned" >= 0);
ALTER TABLE "Wallet" ADD CONSTRAINT wallet_total_withdrawn_non_negative CHECK ("totalWithdrawn" >= 0);

ALTER TABLE "Tip" ADD CONSTRAINT tip_amount_positive CHECK ("amount" > 0);
ALTER TABLE "Tip" ADD CONSTRAINT tip_fee_non_negative CHECK ("fee" >= 0);
ALTER TABLE "Tip" ADD CONSTRAINT tip_net_amount_non_negative CHECK ("netAmount" >= 0);

ALTER TABLE "Transaction" ADD CONSTRAINT transaction_amount_non_negative CHECK ("amount" >= 0);

ALTER TABLE "Payout" ADD CONSTRAINT payout_amount_positive CHECK ("amount" > 0);

ALTER TABLE "Gig" ADD CONSTRAINT gig_budget_min_positive CHECK ("budgetMin" > 0);
ALTER TABLE "Gig" ADD CONSTRAINT gig_budget_max_positive CHECK ("budgetMax" > 0);
ALTER TABLE "Gig" ADD CONSTRAINT gig_budget_min_lte_max CHECK ("budgetMin" <= "budgetMax");

ALTER TABLE "Application" ADD CONSTRAINT application_proposed_budget_positive CHECK ("proposedBudget" > 0);

ALTER TABLE "GigMilestone" ADD CONSTRAINT gig_milestone_amount_positive CHECK ("amount" > 0);

ALTER TABLE "Escrow" ADD CONSTRAINT escrow_amount_positive CHECK ("amount" > 0);

-- Add unique constraint for soft-deleted emails
-- Only unique index on non-deleted users
CREATE UNIQUE INDEX "User_email_deletedAt_unique_idx" ON "User"("email") WHERE "deletedAt" IS NULL;

-- Add check constraint to prevent invalid status transitions
-- (This helps prevent accidentally updating to impossible states)
ALTER TABLE "Tip" ADD CONSTRAINT tip_status_valid CHECK ("status" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'));

ALTER TABLE "Payout" ADD CONSTRAINT payout_status_valid CHECK ("status" IN ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED'));

ALTER TABLE "Gig" ADD CONSTRAINT gig_status_valid CHECK ("status" IN ('DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'));

ALTER TABLE "GigMilestone" ADD CONSTRAINT gig_milestone_status_valid CHECK ("status" IN ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'));

ALTER TABLE "Escrow" ADD CONSTRAINT escrow_status_valid CHECK ("status" IN ('CREATED', 'FUNDED', 'RELEASED', 'REFUNDED', 'DISPUTED'));
