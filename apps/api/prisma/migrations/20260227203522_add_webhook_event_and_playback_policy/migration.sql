-- Add playbackPolicy field to Media table for Mux video privacy control
ALTER TABLE "Media" ADD COLUMN "playbackPolicy" TEXT;

-- Create WebhookEvent table for webhook idempotency
-- Prevents duplicate processing of webhook events from Mux
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on eventId (Mux-provided event ID)
CREATE UNIQUE INDEX "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");

-- Create indexes for efficient querying
CREATE INDEX "WebhookEvent_eventType_idx" ON "WebhookEvent"("eventType");
CREATE INDEX "WebhookEvent_sourceId_idx" ON "WebhookEvent"("sourceId");
