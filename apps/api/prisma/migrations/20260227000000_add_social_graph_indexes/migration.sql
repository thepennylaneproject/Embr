-- Add indexes for follow operations
-- These indexes optimize common social graph queries
CREATE INDEX IF NOT EXISTS "idx_follows_follower_created" ON "Follow"("followerId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_follows_following_created" ON "Follow"("followingId", "createdAt" DESC);

-- Add indexes for blocked user lookups
CREATE INDEX IF NOT EXISTS "idx_blocked_users_blocker_created" ON "BlockedUser"("blockerId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_blocked_users_blocked_created" ON "BlockedUser"("blockedId", "createdAt" DESC);

-- Add indexes for user profile searches
CREATE INDEX IF NOT EXISTS "idx_profiles_username_like" ON "Profile" USING BTREE ("username");
CREATE INDEX IF NOT EXISTS "idx_profiles_created" ON "Profile"("createdAt" DESC);

-- Add indexes for posts to optimize engagement calculations
CREATE INDEX IF NOT EXISTS "idx_posts_author_created" ON "Post"("authorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_posts_created" ON "Post"("createdAt" DESC);

-- Add indexes for user verification status (used in discovery)
CREATE INDEX IF NOT EXISTS "idx_users_verified_created" ON "User"("isVerified", "createdAt" DESC);
