/*
  Warnings:

  - The values [warning,content_removal,suspension,ban] on the enum `ActionType` will be removed. If these variants are still used in the database, this will fail.
  - The values [view,like,comment,share,tip,profile_view,follow,video_watch,gig_view,job_view] on the enum `AnalyticsEventType` will be removed. If these variants are still used in the database, this will fail.
  - The values [pending,under_review,approved,denied] on the enum `AppealStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [submitted,viewed,interviewing,rejected,accepted,withdrawn] on the enum `JobApplicationStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [active,filled,expired] on the enum `JobStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [sent,delivered,read] on the enum `MessageStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [text,image,video,audio,gig_offer] on the enum `MessageType` will be removed. If these variants are still used in the database, this will fail.
  - The values [text,image,video] on the enum `PostType` will be removed. If these variants are still used in the database, this will fail.
  - The values [public,followers,private] on the enum `PostVisibility` will be removed. If these variants are still used in the database, this will fail.
  - The values [spam,harassment,illegal,nsfw_unlabeled,copyright,impersonation,self_harm,other] on the enum `ReportReason` will be removed. If these variants are still used in the database, this will fail.
  - The values [pending,under_review,action_taken,dismissed] on the enum `ReportStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [FEE] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - The values [user,creator,admin] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `amount` on the `Payout` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `emailNotifications` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `pushNotifications` on the `Profile` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Tip` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `balance` on the `Wallet` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `pendingBalance` on the `Wallet` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `totalEarned` on the `Wallet` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `totalWithdrawn` on the `Wallet` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,commentId]` on the table `Like` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeTransferId]` on the table `Payout` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePayoutId]` on the table `Payout` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transactionId]` on the table `Payout` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transactionId]` on the table `Tip` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePaymentIntentId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeTransferId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeConnectAccountId]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `walletId` to the `Payout` table without a default value. This is not possible if the table is not empty.
  - Added the required column `walletId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FilterAction" AS ENUM ('BLOCK', 'FLAG', 'HIDE', 'ALLOW');

-- AlterEnum
BEGIN;
CREATE TYPE "ActionType_new" AS ENUM ('WARNING', 'CONTENT_REMOVAL', 'SUSPENSION', 'BAN');
ALTER TABLE "ModerationAction" ALTER COLUMN "type" TYPE "ActionType_new" USING ("type"::text::"ActionType_new");
ALTER TYPE "ActionType" RENAME TO "ActionType_old";
ALTER TYPE "ActionType_new" RENAME TO "ActionType";
DROP TYPE "ActionType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "AnalyticsEventType_new" AS ENUM ('VIEW', 'LIKE', 'COMMENT', 'SHARE', 'TIP', 'PROFILE_VIEW', 'FOLLOW', 'VIDEO_WATCH', 'GIG_VIEW', 'JOB_VIEW');
ALTER TABLE "AnalyticsEvent" ALTER COLUMN "type" TYPE "AnalyticsEventType_new" USING ("type"::text::"AnalyticsEventType_new");
ALTER TYPE "AnalyticsEventType" RENAME TO "AnalyticsEventType_old";
ALTER TYPE "AnalyticsEventType_new" RENAME TO "AnalyticsEventType";
DROP TYPE "AnalyticsEventType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "AppealStatus_new" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'DENIED');
ALTER TABLE "Appeal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Appeal" ALTER COLUMN "status" TYPE "AppealStatus_new" USING ("status"::text::"AppealStatus_new");
ALTER TYPE "AppealStatus" RENAME TO "AppealStatus_old";
ALTER TYPE "AppealStatus_new" RENAME TO "AppealStatus";
DROP TYPE "AppealStatus_old";
ALTER TABLE "Appeal" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "JobApplicationStatus_new" AS ENUM ('SUBMITTED', 'VIEWED', 'INTERVIEWING', 'REJECTED', 'ACCEPTED', 'WITHDRAWN');
ALTER TABLE "JobApplication" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "JobApplication" ALTER COLUMN "status" TYPE "JobApplicationStatus_new" USING ("status"::text::"JobApplicationStatus_new");
ALTER TYPE "JobApplicationStatus" RENAME TO "JobApplicationStatus_old";
ALTER TYPE "JobApplicationStatus_new" RENAME TO "JobApplicationStatus";
DROP TYPE "JobApplicationStatus_old";
ALTER TABLE "JobApplication" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "JobStatus_new" AS ENUM ('ACTIVE', 'FILLED', 'EXPIRED');
ALTER TABLE "Job" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Job" ALTER COLUMN "status" TYPE "JobStatus_new" USING ("status"::text::"JobStatus_new");
ALTER TYPE "JobStatus" RENAME TO "JobStatus_old";
ALTER TYPE "JobStatus_new" RENAME TO "JobStatus";
DROP TYPE "JobStatus_old";
ALTER TABLE "Job" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MessageStatus_new" AS ENUM ('SENT', 'DELIVERED', 'READ');
ALTER TABLE "Message" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Message" ALTER COLUMN "status" TYPE "MessageStatus_new" USING ("status"::text::"MessageStatus_new");
ALTER TYPE "MessageStatus" RENAME TO "MessageStatus_old";
ALTER TYPE "MessageStatus_new" RENAME TO "MessageStatus";
DROP TYPE "MessageStatus_old";
ALTER TABLE "Message" ALTER COLUMN "status" SET DEFAULT 'SENT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MessageType_new" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'LOCATION', 'GIG_OFFER', 'GIG_MILESTONE');
ALTER TABLE "Message" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Message" ALTER COLUMN "type" TYPE "MessageType_new" USING ("type"::text::"MessageType_new");
ALTER TYPE "MessageType" RENAME TO "MessageType_old";
ALTER TYPE "MessageType_new" RENAME TO "MessageType";
DROP TYPE "MessageType_old";
ALTER TABLE "Message" ALTER COLUMN "type" SET DEFAULT 'TEXT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PostType_new" AS ENUM ('TEXT', 'IMAGE', 'VIDEO');
ALTER TABLE "Post" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Post" ALTER COLUMN "type" TYPE "PostType_new" USING ("type"::text::"PostType_new");
ALTER TYPE "PostType" RENAME TO "PostType_old";
ALTER TYPE "PostType_new" RENAME TO "PostType";
DROP TYPE "PostType_old";
ALTER TABLE "Post" ALTER COLUMN "type" SET DEFAULT 'TEXT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PostVisibility_new" AS ENUM ('PUBLIC', 'FOLLOWERS', 'PRIVATE');
ALTER TABLE "Post" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "Post" ALTER COLUMN "visibility" TYPE "PostVisibility_new" USING ("visibility"::text::"PostVisibility_new");
ALTER TYPE "PostVisibility" RENAME TO "PostVisibility_old";
ALTER TYPE "PostVisibility_new" RENAME TO "PostVisibility";
DROP TYPE "PostVisibility_old";
ALTER TABLE "Post" ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ReportReason_new" AS ENUM ('SPAM', 'HARASSMENT', 'ILLEGAL', 'NSFW_UNLABELED', 'COPYRIGHT', 'IMPERSONATION', 'SELF_HARM', 'OTHER');
ALTER TABLE "Report" ALTER COLUMN "reason" TYPE "ReportReason_new" USING ("reason"::text::"ReportReason_new");
ALTER TYPE "ReportReason" RENAME TO "ReportReason_old";
ALTER TYPE "ReportReason_new" RENAME TO "ReportReason";
DROP TYPE "ReportReason_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ReportStatus_new" AS ENUM ('PENDING', 'UNDER_REVIEW', 'ACTION_TAKEN', 'DISMISSED');
ALTER TABLE "Report" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Report" ALTER COLUMN "status" TYPE "ReportStatus_new" USING ("status"::text::"ReportStatus_new");
ALTER TYPE "ReportStatus" RENAME TO "ReportStatus_old";
ALTER TYPE "ReportStatus_new" RENAME TO "ReportStatus";
DROP TYPE "ReportStatus_old";
ALTER TABLE "Report" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('TIP_SENT', 'TIP_RECEIVED', 'PURCHASE', 'PAYOUT', 'PAYWALL_UNLOCK', 'GIG_PAYMENT', 'GIG_ESCROW', 'GIG_RELEASE', 'PLATFORM_FEE', 'REFUND', 'ADJUSTMENT', 'CREDIT', 'DEBIT');
ALTER TABLE "Transaction" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('USER', 'CREATOR', 'MODERATOR', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Tip" DROP CONSTRAINT "Tip_postId_fkey";

-- DropForeignKey
ALTER TABLE "Tip" DROP CONSTRAINT "Tip_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "Tip" DROP CONSTRAINT "Tip_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- DropIndex
DROP INDEX "Payout_createdAt_idx";

-- AlterTable
ALTER TABLE "Appeal" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "JobApplication" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

-- AlterTable
ALTER TABLE "Like" ADD COLUMN     "commentId" TEXT,
ALTER COLUMN "postId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mediaType" TEXT,
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "type" SET DEFAULT 'TEXT',
ALTER COLUMN "status" SET DEFAULT 'SENT';

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "bankAccountLast4" TEXT,
ADD COLUMN     "fee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "netAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "stripeTransferId" TEXT,
ADD COLUMN     "transactionId" TEXT,
ADD COLUMN     "walletId" TEXT NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "type" SET DEFAULT 'TEXT',
ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "emailNotifications",
DROP COLUMN "pushNotifications",
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Report" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Tip" ADD COLUMN     "fee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "netAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "transactionId" TEXT,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "fee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "netAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "stripeTransferId" TEXT,
ADD COLUMN     "walletId" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ALTER COLUMN "role" SET DEFAULT 'USER';

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kycStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeConnectAccountId" TEXT,
ALTER COLUMN "balance" SET DEFAULT 0,
ALTER COLUMN "balance" SET DATA TYPE INTEGER,
ALTER COLUMN "pendingBalance" SET DEFAULT 0,
ALTER COLUMN "pendingBalance" SET DATA TYPE INTEGER,
ALTER COLUMN "totalEarned" SET DEFAULT 0,
ALTER COLUMN "totalEarned" SET DATA TYPE INTEGER,
ALTER COLUMN "totalWithdrawn" SET DEFAULT 0,
ALTER COLUMN "totalWithdrawn" SET DATA TYPE INTEGER;

-- DropTable
DROP TABLE "Payment";

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "uploadId" TEXT,
    "fileKey" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "thumbnailKey" TEXT,
    "muxAssetId" TEXT,
    "muxPlaybackId" TEXT,
    "playbackUrl" TEXT,
    "duration" DOUBLE PRECISION,
    "aspectRatio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "postId" TEXT,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedUser" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MutedUser" (
    "id" TEXT NOT NULL,
    "muterId" TEXT NOT NULL,
    "mutedId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MutedKeyword" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutedKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilterLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "action" "FilterAction" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "matchedRules" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT[],
    "action" "FilterAction" NOT NULL,
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Media_uploadId_key" ON "Media"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_fileKey_key" ON "Media"("fileKey");

-- CreateIndex
CREATE UNIQUE INDEX "Media_muxAssetId_key" ON "Media"("muxAssetId");

-- CreateIndex
CREATE INDEX "Media_userId_idx" ON "Media"("userId");

-- CreateIndex
CREATE INDEX "Media_status_idx" ON "Media"("status");

-- CreateIndex
CREATE INDEX "Media_fileKey_idx" ON "Media"("fileKey");

-- CreateIndex
CREATE INDEX "BlockedUser_blockerId_idx" ON "BlockedUser"("blockerId");

-- CreateIndex
CREATE INDEX "BlockedUser_blockedId_idx" ON "BlockedUser"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedUser_blockerId_blockedId_key" ON "BlockedUser"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "MutedUser_muterId_idx" ON "MutedUser"("muterId");

-- CreateIndex
CREATE INDEX "MutedUser_mutedId_idx" ON "MutedUser"("mutedId");

-- CreateIndex
CREATE UNIQUE INDEX "MutedUser_muterId_mutedId_key" ON "MutedUser"("muterId", "mutedId");

-- CreateIndex
CREATE INDEX "MutedKeyword_userId_idx" ON "MutedKeyword"("userId");

-- CreateIndex
CREATE INDEX "FilterLog_userId_idx" ON "FilterLog"("userId");

-- CreateIndex
CREATE INDEX "FilterLog_action_idx" ON "FilterLog"("action");

-- CreateIndex
CREATE INDEX "FilterLog_createdAt_idx" ON "FilterLog"("createdAt");

-- CreateIndex
CREATE INDEX "Like_commentId_idx" ON "Like"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_commentId_key" ON "Like"("userId", "commentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripeTransferId_key" ON "Payout"("stripeTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_stripePayoutId_key" ON "Payout"("stripePayoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_transactionId_key" ON "Payout"("transactionId");

-- CreateIndex
CREATE INDEX "Payout_walletId_idx" ON "Payout"("walletId");

-- CreateIndex
CREATE INDEX "Payout_requestedAt_idx" ON "Payout"("requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tip_transactionId_key" ON "Tip"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripePaymentIntentId_key" ON "Transaction"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripeTransferId_key" ON "Transaction"("stripeTransferId");

-- CreateIndex
CREATE INDEX "Transaction_walletId_idx" ON "Transaction"("walletId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_stripeConnectAccountId_key" ON "Wallet"("stripeConnectAccountId");

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Wallet"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Wallet"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedUser" ADD CONSTRAINT "BlockedUser_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedUser" ADD CONSTRAINT "BlockedUser_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutedUser" ADD CONSTRAINT "MutedUser_muterId_fkey" FOREIGN KEY ("muterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutedUser" ADD CONSTRAINT "MutedUser_mutedId_fkey" FOREIGN KEY ("mutedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutedKeyword" ADD CONSTRAINT "MutedKeyword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilterLog" ADD CONSTRAINT "FilterLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
