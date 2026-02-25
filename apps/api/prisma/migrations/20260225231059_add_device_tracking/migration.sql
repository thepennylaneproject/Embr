-- AddColumn RefreshToken device tracking fields
ALTER TABLE "RefreshToken" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "ipAddress" TEXT;
