-- CreateEnum
CREATE TYPE "AudioQuality" AS ENUM ('LOW', 'STANDARD', 'HIGH', 'HIRES');

-- DropIndex
DROP INDEX "idx_blocked_users_blocked_created";

-- DropIndex
DROP INDEX "idx_blocked_users_blocker_created";

-- DropIndex
DROP INDEX "idx_follows_follower_created";

-- DropIndex
DROP INDEX "idx_follows_following_created";

-- DropIndex
DROP INDEX "Message_conversationId_createdAt_idx";

-- DropIndex
DROP INDEX "Payout_userId_status_createdAt_idx";

-- DropIndex
DROP INDEX "Post_authorId_createdAt_idx";

-- DropIndex
DROP INDEX "Post_createdAt_visibility_idx";

-- DropIndex
DROP INDEX "idx_posts_author_created";

-- DropIndex
DROP INDEX "idx_posts_created";

-- DropIndex
DROP INDEX "idx_profiles_created";

-- DropIndex
DROP INDEX "Tip_recipientId_createdAt_idx";

-- DropIndex
DROP INDEX "Tip_senderId_createdAt_idx";

-- DropIndex
DROP INDEX "Transaction_userId_type_createdAt_idx";

-- DropIndex
DROP INDEX "idx_users_verified_created";

-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tip" ADD COLUMN     "trackId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "unreadNotificationCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "PostType" NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "thumbnailUrl" TEXT,
    "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "hashtags" TEXT[],
    "mentions" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "bio" TEXT,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "spotifyId" TEXT,
    "appleMusicalId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "monthlyListeners" INTEGER NOT NULL DEFAULT 0,
    "totalStreams" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "genre" TEXT NOT NULL,
    "totalDuration" INTEGER NOT NULL DEFAULT 0,
    "spotifyUri" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "streams" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "albumId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "audioFormat" TEXT NOT NULL DEFAULT 'mp3',
    "muxAssetId" TEXT,
    "muxPlaybackId" TEXT,
    "hasVideo" BOOLEAN NOT NULL DEFAULT false,
    "videoUrl" TEXT,
    "videoDuration" INTEGER,
    "videoThumbnailUrl" TEXT,
    "muxVideoAssetId" TEXT,
    "muxVideoPlaybackId" TEXT,
    "lyrics" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "licensingModel" TEXT NOT NULL DEFAULT 'restricted',
    "allowRemix" BOOLEAN NOT NULL DEFAULT true,
    "allowMonetize" BOOLEAN NOT NULL DEFAULT true,
    "attributionRequired" BOOLEAN NOT NULL DEFAULT true,
    "streams" BIGINT NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "usedInCount" INTEGER NOT NULL DEFAULT 0,
    "spotifyUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackPlay" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "userId" TEXT,
    "durationPlayed" INTEGER NOT NULL,
    "quality" "AudioQuality" NOT NULL DEFAULT 'STANDARD',
    "royaltyAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackPlay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackLike" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicPlaylist" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "trackIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistStat" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "streams" BIGINT NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "listeners" INTEGER NOT NULL DEFAULT 0,
    "newFollowers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackComment" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TrackComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoUsage" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "licensingModel" TEXT NOT NULL,
    "allowMonetize" BOOLEAN NOT NULL DEFAULT true,
    "attributionUrl" TEXT,
    "usageDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagements" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" INTEGER NOT NULL DEFAULT 0,
    "originalArtistShare" INTEGER NOT NULL DEFAULT 0,
    "creatorShare" INTEGER NOT NULL DEFAULT 0,
    "platformShare" INTEGER NOT NULL DEFAULT 0,
    "isAttributed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledPost_authorId_idx" ON "ScheduledPost"("authorId");

-- CreateIndex
CREATE INDEX "ScheduledPost_scheduledFor_idx" ON "ScheduledPost"("scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledPost_status_idx" ON "ScheduledPost"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_userId_key" ON "Artist"("userId");

-- CreateIndex
CREATE INDEX "Artist_userId_idx" ON "Artist"("userId");

-- CreateIndex
CREATE INDEX "Artist_createdAt_idx" ON "Artist"("createdAt");

-- CreateIndex
CREATE INDEX "Album_artistId_idx" ON "Album"("artistId");

-- CreateIndex
CREATE INDEX "Album_releaseDate_idx" ON "Album"("releaseDate");

-- CreateIndex
CREATE INDEX "Album_createdAt_idx" ON "Album"("createdAt");

-- CreateIndex
CREATE INDEX "Track_artistId_idx" ON "Track"("artistId");

-- CreateIndex
CREATE INDEX "Track_albumId_idx" ON "Track"("albumId");

-- CreateIndex
CREATE INDEX "Track_licensingModel_idx" ON "Track"("licensingModel");

-- CreateIndex
CREATE INDEX "Track_createdAt_idx" ON "Track"("createdAt");

-- CreateIndex
CREATE INDEX "Track_deletedAt_idx" ON "Track"("deletedAt");

-- CreateIndex
CREATE INDEX "TrackPlay_trackId_idx" ON "TrackPlay"("trackId");

-- CreateIndex
CREATE INDEX "TrackPlay_userId_idx" ON "TrackPlay"("userId");

-- CreateIndex
CREATE INDEX "TrackPlay_createdAt_idx" ON "TrackPlay"("createdAt");

-- CreateIndex
CREATE INDEX "TrackLike_userId_idx" ON "TrackLike"("userId");

-- CreateIndex
CREATE INDEX "TrackLike_createdAt_idx" ON "TrackLike"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrackLike_trackId_userId_key" ON "TrackLike"("trackId", "userId");

-- CreateIndex
CREATE INDEX "MusicPlaylist_creatorId_idx" ON "MusicPlaylist"("creatorId");

-- CreateIndex
CREATE INDEX "MusicPlaylist_createdAt_idx" ON "MusicPlaylist"("createdAt");

-- CreateIndex
CREATE INDEX "ArtistStat_artistId_idx" ON "ArtistStat"("artistId");

-- CreateIndex
CREATE INDEX "ArtistStat_date_idx" ON "ArtistStat"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistStat_artistId_date_key" ON "ArtistStat"("artistId", "date");

-- CreateIndex
CREATE INDEX "TrackComment_trackId_idx" ON "TrackComment"("trackId");

-- CreateIndex
CREATE INDEX "TrackComment_userId_idx" ON "TrackComment"("userId");

-- CreateIndex
CREATE INDEX "TrackComment_createdAt_idx" ON "TrackComment"("createdAt");

-- CreateIndex
CREATE INDEX "VideoUsage_trackId_idx" ON "VideoUsage"("trackId");

-- CreateIndex
CREATE INDEX "VideoUsage_contentId_idx" ON "VideoUsage"("contentId");

-- CreateIndex
CREATE INDEX "VideoUsage_creatorId_idx" ON "VideoUsage"("creatorId");

-- CreateIndex
CREATE INDEX "VideoUsage_contentType_idx" ON "VideoUsage"("contentType");

-- CreateIndex
CREATE INDEX "VideoUsage_usageDate_idx" ON "VideoUsage"("usageDate");

-- CreateIndex
CREATE INDEX "VideoUsage_totalRevenue_idx" ON "VideoUsage"("totalRevenue");

-- CreateIndex
CREATE INDEX "WebhookEvent_eventId_idx" ON "WebhookEvent"("eventId");

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackPlay" ADD CONSTRAINT "TrackPlay_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackPlay" ADD CONSTRAINT "TrackPlay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackLike" ADD CONSTRAINT "TrackLike_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackLike" ADD CONSTRAINT "TrackLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicPlaylist" ADD CONSTRAINT "MusicPlaylist_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistStat" ADD CONSTRAINT "ArtistStat_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackComment" ADD CONSTRAINT "TrackComment_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackComment" ADD CONSTRAINT "TrackComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoUsage" ADD CONSTRAINT "VideoUsage_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoUsage" ADD CONSTRAINT "VideoUsage_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
