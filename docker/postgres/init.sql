-- Embr Platform Database Initialization Script
-- This script runs automatically when PostgreSQL container starts for the first time

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For indexed JSON queries

-- Create custom types (these will be created by Prisma migrations, but defining here for completeness)
-- DO $$ BEGIN
--   CREATE TYPE "UserRole" AS ENUM ('user', 'creator', 'admin');
-- EXCEPTION
--   WHEN duplicate_object THEN null;
-- END $$;

-- Set timezone
SET timezone = 'UTC';

-- Create custom functions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to increment/decrement counters safely
CREATE OR REPLACE FUNCTION increment_counter(
  table_name TEXT,
  counter_column TEXT,
  id_column TEXT,
  id_value TEXT,
  increment_by INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = GREATEST(0, %I + $1) WHERE %I = $2',
    table_name, counter_column, counter_column, id_column
  ) USING increment_by, id_value;
END;
$$ LANGUAGE plpgsql;

-- Function for soft delete
CREATE OR REPLACE FUNCTION soft_delete(
  table_name TEXT,
  id_value TEXT
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    table_name
  ) USING id_value;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate engagement score for posts
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  view_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  created_at TIMESTAMP
)
RETURNS FLOAT AS $$
DECLARE
  hours_old FLOAT;
  decay_factor FLOAT;
  weighted_score FLOAT;
BEGIN
  -- Calculate age in hours
  hours_old := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600;
  
  -- Time decay factor (halves every 24 hours)
  decay_factor := POWER(0.5, hours_old / 24);
  
  -- Weighted engagement score
  weighted_score := (
    view_count * 1 +
    like_count * 10 +
    comment_count * 20 +
    share_count * 30
  );
  
  -- Apply decay
  RETURN weighted_score * decay_factor;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get recommended posts for a user
CREATE OR REPLACE FUNCTION get_recommended_posts(
  user_id_param TEXT,
  limit_param INTEGER DEFAULT 20
)
RETURNS TABLE (
  post_id TEXT,
  score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_interests AS (
    -- Get user's interested categories from their likes and follows
    SELECT DISTINCT unnest(p.hashtags) as hashtag
    FROM "Like" l
    JOIN "Post" p ON p.id = l."postId"
    WHERE l."userId" = user_id_param
    LIMIT 50
  ),
  followed_creators AS (
    SELECT "followingId" as creator_id
    FROM "Follow"
    WHERE "followerId" = user_id_param
  )
  SELECT 
    p.id::TEXT as post_id,
    calculate_engagement_score(
      p."viewCount",
      p."likeCount",
      p."commentCount",
      p."shareCount",
      p."createdAt"
    ) * (
      -- Boost score if from followed creator
      CASE WHEN p."authorId" IN (SELECT creator_id FROM followed_creators) THEN 2.0 ELSE 1.0 END
    ) * (
      -- Boost score if hashtags match user interests
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM user_interests ui 
          WHERE ui.hashtag = ANY(p.hashtags)
        ) THEN 1.5 
        ELSE 1.0 
      END
    ) as score
  FROM "Post" p
  WHERE 
    p."deletedAt" IS NULL
    AND p.visibility = 'public'
    AND p."authorId" != user_id_param
    -- Exclude posts user has already liked
    AND p.id NOT IN (
      SELECT "postId" FROM "Like" WHERE "userId" = user_id_param
    )
  ORDER BY score DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance (in addition to Prisma indexes)

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON "Profile" USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON "Profile" USING gin ("displayName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_content_trgm ON "Post" USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_gigs_title_trgm ON "Gig" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON "Job" USING gin (title gin_trgm_ops);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON "Post" ("authorId", "createdAt" DESC) WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_visibility_created ON "Post" (visibility, "createdAt" DESC) WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_creator_status ON "Booking" ("creatorId", status);
CREATE INDEX IF NOT EXISTS idx_bookings_buyer_status ON "Booking" ("buyerId", status);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_gigs_active ON "Gig" ("createdAt" DESC) WHERE status = 'active' AND "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_active ON "Job" ("postedAt" DESC) WHERE status = 'active';

-- Array indexes for hashtags and skills
CREATE INDEX IF NOT EXISTS idx_posts_hashtags_gin ON "Post" USING gin (hashtags);
CREATE INDEX IF NOT EXISTS idx_profiles_skills_gin ON "Profile" USING gin (skills);
CREATE INDEX IF NOT EXISTS idx_gigs_skills_gin ON "Gig" USING gin (skills);

-- Grant permissions to superuser role
GRANT ALL PRIVILEGES ON DATABASE embr TO embr;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO embr;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO embr;

-- Create auth schema for RLS helper functions
CREATE SCHEMA IF NOT EXISTS auth;

-- Create least-privilege app role (used by the NestJS API)
-- Password is overridden via APP_DATABASE_URL in production
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'embr_app') THEN
    CREATE ROLE embr_app WITH LOGIN PASSWORD 'embr_app_dev_password';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE embr TO embr_app;
GRANT USAGE ON SCHEMA public TO embr_app;
GRANT USAGE ON SCHEMA auth TO embr_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO embr_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO embr_app;

-- Future tables created by migrations also grant access to embr_app
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO embr_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO embr_app;

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'Embr database initialized successfully!';
  RAISE NOTICE 'Extensions enabled: uuid-ossp, pg_trgm, btree_gin';
  RAISE NOTICE 'Custom functions created: update_updated_at_column, calculate_engagement_score, get_recommended_posts';
END $$;
