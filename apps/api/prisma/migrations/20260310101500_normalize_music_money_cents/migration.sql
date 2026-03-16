-- Normalize music monetary fields to integer cents.
-- This is a phased corrective migration after earlier mixed float/int changes.

-- Safety check: reject obviously corrupted USD values before conversion.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Track"
    WHERE "price" < 0 OR "price" > 1000000
  ) THEN
    RAISE EXCEPTION 'Track.price contains out-of-range USD values; audit data before converting to cents.';
  END IF;
END $$;

-- Convert float USD values into integer cents.
ALTER TABLE "Track"
  ALTER COLUMN "price" TYPE INTEGER
  USING CAST(ROUND("price" * 100) AS INTEGER);

ALTER TABLE "ArtistStat"
  ALTER COLUMN "revenue" TYPE INTEGER
  USING CAST(ROUND("revenue" * 100) AS INTEGER);

ALTER TABLE "Track"
  ALTER COLUMN "price" SET DEFAULT 0;

ALTER TABLE "ArtistStat"
  ALTER COLUMN "revenue" SET DEFAULT 0;
