# S3 Lifecycle Policy & Cleanup Configuration

## Overview

This document describes how to set up automatic cleanup of orphaned S3 multipart uploads to prevent unbounded storage costs.

**Cost Impact:** AWS charges ~$0.05 per GB per month for incomplete multipart upload parts. Without cleanup, orphaned uploads can cost $100+ per month at scale.

---

## Option 1: S3 Lifecycle Policy (Recommended - Automatic)

S3 can automatically abort incomplete multipart uploads after a specified number of days.

### Setup Steps

1. **Via AWS Console:**
   - Go to S3 → Your Bucket → Properties → Lifecycle Rules
   - Create new rule
   - Configure as shown in `s3-lifecycle-policy.json`:
     ```json
     {
       "Id": "AbortIncompleteMultipartUploads",
       "Status": "Enabled",
       "AbortIncompleteMultipartUpload": {
         "DaysAfterInitiation": 1
       }
     }
     ```
   - Apply the rule

2. **Via AWS CLI:**
   ```bash
   aws s3api put-bucket-lifecycle-configuration \
     --bucket your-bucket-name \
     --lifecycle-configuration file://s3-lifecycle-policy.json
   ```

3. **Via Terraform:**
   ```hcl
   resource "aws_s3_bucket_lifecycle_configuration" "media_bucket" {
     bucket = aws_s3_bucket.media.id

     rule {
       id     = "abort-incomplete-multipart-uploads"
       status = "Enabled"

       abort_incomplete_multipart_upload {
         days_after_initiation = 1
       }
     }
   }
   ```

### Verification

Check that the policy is applied:
```bash
aws s3api get-bucket-lifecycle-configuration --bucket your-bucket-name
```

---

## Option 2: Application-Level Cleanup Job (Backup/Monitoring)

The `S3MultipartService.abortStaleMultipartUploads()` method provides programmatic cleanup as a safety net.

### Implementation

1. **Add to your application scheduler (NestJS):**

```typescript
// src/jobs/s3-cleanup.schedule.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { S3MultipartService } from '../media/services/s3-multipart.service';

@Injectable()
export class S3CleanupSchedule {
  constructor(private s3Service: S3MultipartService) {}

  /**
   * Run cleanup job every 6 hours
   * Aborts multipart uploads older than 24 hours
   */
  @Cron('0 */6 * * *')
  async cleanupStaleUploads() {
    const result = await this.s3Service.abortStaleMultipartUploads(24);
    console.log(`Cleanup: Aborted ${result.abortedCount} uploads`);
  }
}
```

2. **Add to your module:**

```typescript
// src/app.module.ts
import { ScheduleModule } from '@nestjs/schedule';
import { S3CleanupSchedule } from './jobs/s3-cleanup.schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [S3CleanupSchedule],
})
export class AppModule {}
```

3. **Monitor & Alert:**

Add metrics/monitoring to track cleanup:
```typescript
@Cron('0 0 * * *') // Daily report
async reportMultipartStatus() {
  const result = await this.s3Service.abortStaleMultipartUploads(24);

  // Send to monitoring/alerting system
  this.metricsService.recordGauge('orphaned_uploads_aborted', result.abortedCount);
  this.metricsService.recordGauge('storage_released_bytes', result.releasedBytes);
}
```

---

## Best Practices

1. **Use S3 Lifecycle Policy as Primary Defense**
   - Automatic, no code required
   - Applies to all uploads, even external ones
   - Costs $0 (built into S3)

2. **Use Application-Level Cleanup as Monitoring**
   - Provides visibility into orphaned uploads
   - Allows custom logic (e.g., notifications)
   - Good for debugging and cost tracking

3. **Set Reasonable Expiry**
   - 24 hours: Good for most use cases
   - Allows resume/retry from client side
   - Most uploads complete within hours

4. **Monitor & Alert**
   - Track count of abandoned uploads
   - Alert if cleanup fails
   - Monitor cost impact of orphaned parts

5. **Document in Terraform**
   - Version control bucket configuration
   - Track lifecycle policy changes
   - Easy to audit and reproduce

---

## Cost Calculations

### Before Cleanup

| Scenario | Orphaned GB | Monthly Cost |
|----------|------------|--------------|
| 1000 uploads, 100MB each | 100GB | $5.00 |
| 10,000 uploads, 100MB each | 1,000GB | $50.00 |
| 100,000 uploads, 100MB each | 10,000GB | $500.00 |

### After Cleanup (1-day abort)

| Scenario | Max Orphaned GB | Monthly Cost |
|----------|-----------------|--------------|
| 1000 uploads/day, 100MB each | ~5GB (one-day buffer) | $0.25 |
| 10,000 uploads/day, 100MB each | ~50GB (one-day buffer) | $2.50 |
| 100,000 uploads/day, 100MB each | ~500GB (one-day buffer) | $25.00 |

**Savings:** 90-95% reduction in costs for orphaned uploads

---

## Troubleshooting

### No multipart uploads being cleaned up

1. Check if uploads actually exist:
   ```bash
   aws s3api list-multipart-uploads --bucket your-bucket-name
   ```

2. Verify lifecycle policy is enabled:
   ```bash
   aws s3api get-bucket-lifecycle-configuration --bucket your-bucket-name
   ```

3. Check CloudWatch Logs for S3 events

### High cost still occurring

1. Check default expiry date (should be 1 day)
2. Verify no other incomplete uploads are being created
3. Monitor actual upload completion rates

### Need to manually abort an upload

```bash
aws s3api abort-multipart-upload \
  --bucket your-bucket-name \
  --key path/to/file.mp4 \
  --upload-id upload-id-here
```

---

## Security Considerations

- S3 Lifecycle Policy applies to entire bucket (cannot target specific prefixes)
- User-scoped file paths (e.g., `images/2024/11/{userId}/file.jpg`) ensure fair cleanup
- No sensitive data loss risk (incomplete parts are never used)
- Lifecycle policy is non-destructive (only deletes unused parts)

---

## References

- AWS S3 Lifecycle Documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html
- Multipart Upload Cleanup: https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html#mpu-cleanup-incomplete-upload-sets
- NestJS Schedule Module: https://docs.nestjs.com/techniques/task-scheduling
