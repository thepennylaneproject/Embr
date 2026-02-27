# Migration: Webhook Event Deduplication & Mux Playback Policy

**Date:** February 27, 2026
**Migration ID:** 20260227203522_add_webhook_event_and_playback_policy
**Related Issues:** Media Audit #2 (Webhook Idempotency), #4 (Mux Playback Policies)

## Overview

This migration adds support for:
1. **Webhook Idempotency** - Prevents duplicate processing of Mux webhook events
2. **Mux Playback Policy** - Allows creators to control video privacy (public or signed URLs)

## Schema Changes

### 1. Add `playbackPolicy` to Media Table

```sql
ALTER TABLE "Media" ADD COLUMN "playbackPolicy" TEXT;
```

**Purpose:** Store whether a Mux video uses 'public' or 'signed' playback policy
**Values:**
- `'public'` - Video accessible by anyone with the playback ID
- `'signed'` - Video requires signed URL (private by default)
- `NULL` - For non-video media or legacy records

### 2. Create `WebhookEvent` Table

```sql
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,  -- Mux-provided unique event ID
    "eventType" TEXT NOT NULL,  -- e.g., 'video.asset.ready', 'video.upload.errored'
    "sourceId" TEXT NOT NULL,  -- Asset ID or Upload ID from webhook
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Track processed webhooks to prevent duplicate event handling

**Indexes:**
- `eventId` (UNIQUE) - Prevent duplicate events
- `eventType` - Query by event type
- `sourceId` - Link to media assets

## Migration Steps

### For Development/Staging

```bash
# Navigate to API directory
cd apps/api

# Run migration
npx prisma migrate deploy

# Generate updated Prisma client
npx prisma generate
```

### For Production

```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migration (with monitoring)
npx prisma migrate deploy

# 3. Verify migration
psql $DATABASE_URL -c "\dt WebhookEvent"
psql $DATABASE_URL -c "\d Media" | grep playbackPolicy
```

## Rollback Plan

If issues occur, rollback with:

```bash
npx prisma migrate resolve --rolled-back 20260227203522_add_webhook_event_and_playback_policy
```

**Important:** This will remove the `WebhookEvent` table and `playbackPolicy` column. Ensure no data loss before rollback.

## Data Cleanup (If Needed)

### Initialize playbackPolicy for existing videos

```sql
-- Set all existing Mux videos to 'signed' (secure default)
UPDATE "Media"
SET "playbackPolicy" = 'signed'
WHERE "muxPlaybackId" IS NOT NULL
  AND "playbackPolicy" IS NULL;

-- Set non-Mux media to NULL (not applicable)
UPDATE "Media"
SET "playbackPolicy" = NULL
WHERE "muxPlaybackId" IS NULL;
```

## Testing

### 1. Verify Table Creation

```bash
psql $DATABASE_URL -c "SELECT * FROM \"WebhookEvent\" LIMIT 0;"
```

Should return:
```
 id | eventId | eventType | sourceId | processedAt | createdAt
----+---------+-----------+----------+-------------+-----------
(0 rows)
```

### 2. Verify Columns

```bash
psql $DATABASE_URL -c "SELECT playbackPolicy FROM \"Media\" LIMIT 1;"
```

Should show `playbackPolicy` column exists.

### 3. Verify Indexes

```bash
psql $DATABASE_URL -c "SELECT * FROM pg_indexes WHERE tablename = 'WebhookEvent';"
```

Should show 4 indexes:
- `WebhookEvent_eventId_key` (unique)
- `WebhookEvent_eventType_idx`
- `WebhookEvent_sourceId_idx`
- `WebhookEvent_pkey` (primary key)

## Implementation Notes

### Webhook Deduplication Logic

The `WebhookEvent` table is used by:

1. **Controller** (`mux-webhook.controller.ts`):
   - Extract `eventId` from webhook body
   - Check if already processed: `mediaService.webhookEventProcessed(eventId)`
   - Mark as processed after handling: `mediaService.markWebhookEventProcessed(eventId, ...)`

2. **Service** (`media.service.ts`):
   - `webhookEventProcessed()` - Returns boolean if event exists
   - `markWebhookEventProcessed()` - Inserts record (or silently ignores if duplicate)

### Playback Policy Usage

The `playbackPolicy` field is used by:

1. **Upload Controller** (`media-upload.controller.ts`):
   - Accept `isPrivate` flag from client (defaults to private)
   - Pass to Mux: `playbackPolicy = isPrivate ? ['signed'] : ['public']`
   - Store in DB via `mediaService.createMediaRecord()`

2. **Notification Service**:
   - Optionally filter based on policy when notifying users

## Performance Considerations

### Indexes
- `eventId` is UNIQUE - prevents duplicates efficiently
- `eventType`, `sourceId` are indexed for fast queries
- Expected <1ms lookup time for idempotency check

### Cleanup Strategy
Webhooks are not automatically deleted. Consider adding a cleanup job:

```typescript
// Optional: Clean up processed webhooks older than 30 days
@Cron('0 2 * * *') // Daily at 2 AM
async cleanupOldWebhooks() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await this.prisma.webhookEvent.deleteMany({
    where: { createdAt: { lt: thirtyDaysAgo } }
  });
}
```

## Rollback Contingency

If you need to rollback without losing data:

1. **Keep table, remove constraints:**
   ```sql
   ALTER TABLE "WebhookEvent" DROP CONSTRAINT "WebhookEvent_eventId_key";
   ```

2. **Keep column, disable migration:**
   ```bash
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

3. **Full rollback:**
   ```bash
   pg_restore < backup_YYYYMMDD_HHMMSS.sql
   ```

## Related Documentation

- [Webhook Idempotency Design](../../MEDIA_DOMAIN_AUDIT.md#issue-2-mux-webhooks-not-idempotent)
- [Media Upload Security](../../MEDIA_DOMAIN_AUDIT.md#upload-security)
- [Mux Integration](../../MEDIA_DOMAIN_AUDIT.md#mux-integration)

## Questions?

Refer to:
- Schema file: `apps/api/prisma/schema.prisma`
- Audit report: `MEDIA_DOMAIN_AUDIT.md`
- Service implementation: `apps/api/src/core/media/services/`
