# Embr Media Domain Security Audit Report

**Audit Date:** February 27, 2026
**Scope:** Media upload pipeline (S3, Mux, thumbnails, frontend)
**Status:** 🔴 **Critical Issues Found** - 4 Critical, 6 Warnings, 3 Suggestions

---

## Executive Summary

The Embr media domain implements a comprehensive multipart upload system with Mux video processing and thumbnail generation. However, **several critical security and operational gaps** exist that could expose user data, increase AWS costs, and prevent proper error recovery. The most urgent issues involve:

1. **Lack of user-scoped file paths** in S3 (allows potential enumeration)
2. **No webhook idempotency** (duplicate processing on retries)
3. **No orphaned multipart upload cleanup** (AWS cost leakage)
4. **Public Mux videos by default** (unintended data exposure)
5. **Missing file size validation at API level** (DOS and quota abuse risk)

---

## 🔴 Critical Issues

### 1. **S3 File Keys Not Scoped to User (Authorization Bypass Risk)**

**Severity:** 🔴 CRITICAL
**Files:** `apps/api/src/core/media/services/s3-multipart.service.ts:306-316`
**Issue:**
- File keys are generated as: `${contentType}s/${year}/${month}/${uuid}-${timestamp}.${extension}`
- **No userId is embedded in the path**
- If an attacker discovers the year/month/timestamp pattern, they could enumerate UUIDs to guess other users' files
- Presigned URLs are time-limited but anyone with the URL can access the content

**Example Attack:**
```
# Real file path
images/2024/11/a1b2c3d4-e5f6-4g7h-8i9j-k0l1m2n3o4/file.jpg

# Attacker can brute force UUIDs in same month:
images/2024/11/{random-uuid}/file.jpg
```

**Risk:**
- Potential access to other users' private images/videos
- Privacy breach for uploaded media
- Violates principle of least privilege

**Recommended Fix:**
```typescript
private generateFileKey(
  userId: string,  // ADD THIS
  contentType: 'image' | 'video' | 'document',
  extension: string,
): string {
  const timestamp = Date.now();
  const uuid = uuidv4();
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  // Include userId in path
  return `${contentType}s/${year}/${month}/${userId}/${uuid}-${timestamp}.${extension}`;
}
```

**Action Items:**
- ✅ Add userId parameter to generateFileKey()
- ✅ Update all callers to pass userId
- ✅ Add validation to ensure userId matches authenticated user on all operations
- ✅ Consider adding encryption to file keys or using opaque identifiers

---

### 2. **Mux Webhooks Not Idempotent (Duplicate Processing on Retries)**

**Severity:** 🔴 CRITICAL
**Files:** `apps/api/src/core/media/controllers/mux-webhook.controller.ts:37-76`, `apps/api/src/core/media/services/media.service.ts:150-186`
**Issue:**
- Webhook handlers update database records directly without idempotency checks
- If Mux retries a webhook (network timeout, etc.), the database is updated multiple times
- No deduplication key based on event ID + type

**Example Scenario:**
1. Video processing completes → `video.asset.ready` webhook sent
2. Network timeout, Mux retries webhook
3. Media record gets updated twice, potentially triggering duplicate notifications
4. If webhook includes increment counters, they would be duplicated

**Code Analysis:**
```typescript
// mux-webhook.controller.ts:118-174 - No idempotency check
async handleAssetReady(data: any): Promise<void> {
  const assetId = data.id;
  // ... directly updates DB without checking if already processed
  await this.mediaService.updateMediaWithMuxData(media.id, {...});
}
```

**Risk:**
- Duplicate notifications sent to users
- Incorrect state if webhooks trigger business logic
- Cost implications if webhooks trigger paid operations
- Data inconsistency in DB (e.g., multiple completedAt timestamps)

**Recommended Fix:**
```typescript
// Add webhook deduplication
@Post()
async handleWebhook(
  @Req() request: RawBodyRequest<Request>,
  @Headers('mux-signature') signature: string,
  @Headers('mux-timestamp') timestamp: string,
  @Headers('mux-id') eventId: string,  // Mux provides this
  @Body() body: any,
) {
  // Verify signature first
  if (!this.muxService.verifyWebhookSignature(rawBody, signature, timestamp)) {
    throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
  }

  // Check if already processed
  const alreadyProcessed = await this.mediaService.webhookProcessed(eventId);
  if (alreadyProcessed) {
    return { success: true, message: 'Already processed' };
  }

  // Process and mark as processed atomically
  await this.processWebhookEvent(body);
  await this.mediaService.markWebhookProcessed(eventId);

  return { success: true };
}
```

**Action Items:**
- ✅ Add webhook event deduplication table with eventId (Mux-Id header)
- ✅ Check deduplication before processing any webhook
- ✅ Add atomic transaction for process + mark-as-processed
- ✅ Add TTL to deduplication records (30 days cleanup)

---

### 3. **No Cleanup for Orphaned S3 Multipart Uploads (AWS Cost Leakage)**

**Severity:** 🔴 CRITICAL
**Files:** `apps/api/src/core/media/services/s3-multipart.service.ts` (missing)
**Issue:**
- Multipart uploads that are initiated but never completed leave parts in S3
- AWS charges for storage of incomplete parts (~$0.05 per GB per month)
- No background job or S3 lifecycle policy shown to clean these up
- The `abortMultipartUpload()` exists but is only called on user cancellation
- If user disconnects mid-upload, parts remain orphaned indefinitely

**Example Cost Impact:**
- 1000 incomplete uploads × 100MB average = 100GB orphaned
- 100GB × $0.05/month = $5/month permanent cost

**Risk:**
- Unbounded AWS costs from orphaned parts
- No visibility into orphaned upload count
- Could accumulate to $1000+/month on high-volume platform

**Recommended Fix:**
```typescript
// Add to S3MultipartService
async abortStaleMultipartUploads(ageHours: number = 24): Promise<number> {
  const s3 = new S3Client({ region: this.region });
  const command = new ListMultipartUploadsCommand({
    Bucket: this.bucket,
  });

  const result = await s3.send(command);
  let abortedCount = 0;
  const ageMs = ageHours * 60 * 60 * 1000;
  const now = Date.now();

  for (const upload of result.Uploads || []) {
    if (upload.Initiated && (now - upload.Initiated.getTime()) > ageMs) {
      await s3.send(new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: upload.Key,
        UploadId: upload.UploadId,
      }));
      abortedCount++;
      this.logger.log(`Aborted stale multipart: ${upload.Key}/${upload.UploadId}`);
    }
  }

  return abortedCount;
}
```

**Alternative: S3 Lifecycle Policy**
```json
{
  "Rules": [
    {
      "Id": "AbortIncompleteMultipartUpload",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 1
      }
    }
  ]
}
```

**Action Items:**
- ✅ Implement S3 Lifecycle Policy to abort multipart uploads after 24 hours
- ✅ OR add background job using @Cron to abort stale uploads hourly
- ✅ Add monitoring/metrics for orphaned upload count
- ✅ Log and alert if orphaned upload count exceeds threshold
- ✅ Document AWS cost savings in implementation

---

### 4. **Mux Videos Created with Public Playback Policy (Unintended Data Exposure)**

**Severity:** 🔴 CRITICAL
**Files:** `apps/api/src/core/media/controllers/media-upload.controller.ts:135-159`
**Issue:**
```typescript
// Line 136: Force public playback policy
const muxResult = await this.muxService.createDirectUpload('*', {
  playbackPolicy: ['public'],  // ❌ ALWAYS PUBLIC
  mp4Support: 'standard',
  normalizeAudio: true,
  maxResolution: 'high',
});
```

- Videos are ALWAYS created with `playbackPolicy: ['public']`
- Hardcoded to public, ignoring any user intent for private videos
- Any Mux playback ID can be accessed globally without authentication
- Mux thumbnails and GIFs are also public

**Risk:**
- Private/sensitive videos exposed to anyone who knows playback ID
- Creator assumes videos are private, but they're public
- GDPR/privacy violations
- Content theft by competitors

**Recommended Fix:**
```typescript
private async initiateMuxUpload(userId: string, dto: InitiateUploadDto) {
  // Accept isPrivate flag from client
  const playbackPolicy = dto.isPrivate ? ['signed'] : ['public'];

  const muxResult = await this.muxService.createDirectUpload('*', {
    playbackPolicy,  // ✅ Dynamic based on user preference
    mp4Support: 'standard',
    normalizeAudio: true,
    maxResolution: 'high',
  });

  // Store playback policy in media record
  await this.mediaService.createMediaRecord({
    userId,
    // ...
    playbackPolicy,  // ✅ Store for later retrieval
    status: 'uploading',
  });

  return {
    uploadType: 'mux',
    uploadId: muxResult.uploadId,
    uploadUrl: muxResult.uploadUrl,
    assetId: muxResult.assetId,
  };
}
```

**Action Items:**
- ✅ Add `isPrivate` flag to InitiateUploadDto
- ✅ Default to signed playback for private videos
- ✅ Store playback policy in media record
- ✅ Update getSignedUrl() to respect playback policy
- ✅ Add migration to update existing public videos (or re-encode with signed policy)

---

## 🟡 Warnings

### 5. **No Maximum File Size Validation at API Level (DOS & Quota Abuse)**

**Severity:** 🟡 WARNING
**Files:** `apps/api/src/core/media/dto/media-upload.dto.ts:29-60`, `apps/api/src/core/media/controllers/media-upload.controller.ts:50-77`
**Issue:**
- `InitiateUploadDto` has `@Min(1)` but NO `@Max()` validator on fileSize
- API will generate presigned URLs for multi-GB files
- No per-user quota enforcement
- No rate limiting on upload initiation

**Code:**
```typescript
// dto/media-upload.dto.ts - Missing @Max()
export class InitiateUploadDto {
  @IsNumber()
  @Min(1)  // ❌ Only minimum, no maximum
  fileSize: number;
}
```

**Risk:**
- User could upload 100GB file and exhaust S3 quota
- Attacker could enumerate presigned URLs for malicious files
- No tracking of per-user upload quota

**Recommended Fix:**
```typescript
export class InitiateUploadDto {
  @IsNumber()
  @Min(1)
  @Max(1024 * 1024 * 1024)  // ✅ 1GB max, adjust per tier
  fileSize: number;
}

// In media-upload.controller.ts
async initiateUpload(
  @CurrentUser() user: any,
  @Body() dto: InitiateUploadDto,
) {
  // Add quota check
  const userStats = await this.mediaService.getMediaStats(user.id);
  const quota = 100 * 1024 * 1024 * 1024; // 100GB per user

  if (userStats.totalSize + dto.fileSize > quota) {
    throw new HttpException(
      `Upload exceeds quota. ${(userStats.totalSize / 1024 / 1024 / 1024).toFixed(1)}GB used of ${(quota / 1024 / 1024 / 1024).toFixed(1)}GB`,
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }

  // ... proceed with upload
}
```

**Action Items:**
- ✅ Add `@Max()` validators to fileSize in DTO
- ✅ Add per-user quota enforcement before presigned URL generation
- ✅ Add quota limits to user profile/tier
- ✅ Add rate limiting to upload initiation endpoint

---

### 6. **Webhook Timestamp Not Validated for Replay Attacks**

**Severity:** 🟡 WARNING
**Files:** `apps/api/src/core/media/services/mux-video.service.ts:269-285`
**Issue:**
- Signature is verified but timestamp freshness is never checked
- Could allow replay attacks if old webhooks are captured

**Code:**
```typescript
verifyWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
): boolean {
  try {
    return (Mux as any).webhooks.verifyHeader(
      rawBody,
      signature,
      this.webhookSecret,
      timestamp,  // ❌ No freshness check after verification
    );
  } catch (error) {
    return false;
  }
}
```

**Risk:**
- Replaying old webhooks could cause state transitions
- Though unlikely in practice (Mux has safeguards), best practice requires validation

**Recommended Fix:**
```typescript
verifyWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  maxAgeSeconds: number = 300,
): boolean {
  try {
    const verified = (Mux as any).webhooks.verifyHeader(
      rawBody,
      signature,
      this.webhookSecret,
      timestamp,
    );

    if (!verified) return false;

    // ✅ Check timestamp freshness
    const webhookTime = parseInt(timestamp, 10) * 1000; // Convert to ms
    const timeDiff = Math.abs(Date.now() - webhookTime);

    if (timeDiff > maxAgeSeconds * 1000) {
      this.logger.warn(
        `Webhook timestamp too old: ${timeDiff / 1000}s old`,
      );
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}
```

**Action Items:**
- ✅ Add timestamp freshness validation (5 minutes = 300 seconds typical)
- ✅ Log rejections for monitoring
- ✅ Configure max age based on network conditions

---

### 7. **No Error Notification to User (Silent Failures)**

**Severity:** 🟡 WARNING
**Files:** `apps/api/src/core/media/controllers/mux-webhook.controller.ts:179-199`
**Issue:**
- When Mux reports video processing error, only DB is updated
- User receives no notification about failed uploads
- Creator assumes video is processing, never learns of error

**Code:**
```typescript
private async handleAssetErrored(data: any): Promise<void> {
  const assetId = data.id;
  const errors = data.errors || [];

  try {
    const media = await this.mediaService.getMediaByMuxAssetId(assetId);
    if (media) {
      // ❌ Only updates DB, no user notification
      await this.mediaService.updateMediaStatus(media.id, 'error', {
        errorMessage: JSON.stringify(errors),
      });
    }
  } catch (error) {
    // ...
  }
}
```

**Risk:**
- User experience degradation (silent failures)
- Creator thinks video is still processing days later
- Business metrics unclear (can't distinguish cancelled vs. failed)

**Recommended Fix:**
```typescript
private async handleAssetErrored(data: any): Promise<void> {
  const assetId = data.id;
  const errors = data.errors || [];

  try {
    const media = await this.mediaService.getMediaByMuxAssetId(assetId);
    if (media) {
      const errorMessage = errors
        .map((e: any) => e.message || JSON.stringify(e))
        .join('; ');

      await this.mediaService.updateMediaStatus(media.id, 'error', {
        errorMessage,
      });

      // ✅ Notify user
      this.eventEmitter.emit('media.upload.failed', {
        userId: media.userId,
        mediaId: media.id,
        fileName: media.fileName,
        reason: errorMessage,
      });

      // ✅ Or send email/in-app notification
      // await this.notificationService.sendMediaErrorNotification(
      //   media.userId,
      //   media.fileName,
      //   errorMessage
      // );
    }
  } catch (error) {
    this.logger.error(
      `Failed to process asset.errored for ${assetId}`,
      error.stack,
    );
  }
}
```

**Action Items:**
- ✅ Emit event on video error for notification service
- ✅ Add email/in-app notification for failed uploads
- ✅ Include retry link or troubleshooting guidance
- ✅ Track error types in metrics/monitoring

---

### 8. **Magic Bytes Validation Not Enforced During Upload**

**Severity:** 🟡 WARNING
**Files:** `apps/api/src/core/media/services/media-validator.service.ts:139-175`
**Issue:**
- MediaValidatorService has comprehensive `checkForMalicious()` method
- **But it's never called** during upload initiation
- Only checks MIME type, not actual file content
- Can upload PHP/ELF executables disguised as JPEGs

**Code:**
```typescript
// media-validator.service.ts - has malicious check
checkForMalicious(buffer: Buffer, mimeType: string): { safe: boolean; reason?: string } {
  // Checks for ELF, PE, PHP, etc.
}

// media-upload.controller.ts - never uses it
async initiateUpload(
  @CurrentUser() user: any,
  @Body() dto: InitiateUploadDto,
) {
  this.validateFileType(dto.fileType, dto.contentType);  // ❌ Only MIME type
  // ❌ NEVER calls checkForMalicious()
}
```

**Risk:**
- Polyglot files (image + executable) could be uploaded
- PHP shell injection attacks
- Zip bombs disguised as images

**Recommended Fix:**
- Magic bytes validation should happen AFTER file upload (server has buffer)
- For presigned URLs, AWS can't check content
- Add server-side verification after completion:

```typescript
async completeUpload(
  @CurrentUser() user: any,
  @Body() dto: CompleteUploadDto,
) {
  // Get file from S3
  const fileBuffer = await this.s3Service.downloadFile(dto.fileKey);

  // ✅ Check for malicious content
  const maliciousCheck = this.mediaValidator.checkForMalicious(
    fileBuffer,
    dto.fileType,
  );

  if (!maliciousCheck.safe) {
    await this.s3Service.deleteFile(dto.fileKey);
    throw new HttpException(
      `File rejected: ${maliciousCheck.reason}`,
      HttpStatus.BAD_REQUEST,
    );
  }

  // Continue with processing...
}
```

**Action Items:**
- ✅ Add file download & magic bytes check in completeUpload()
- ✅ Reject files containing executable signatures
- ✅ Log rejected files for security monitoring
- ✅ Consider ClamAV integration for antivirus scanning

---

### 9. **Presigned URL Expiry Too Long (1 Hour)**

**Severity:** 🟡 WARNING
**Files:** `apps/api/src/core/media/controllers/media-upload.controller.ts:87`, `apps/api/src/core/media/services/s3-multipart.service.ts:81`
**Issue:**
- Presigned URLs expire after 1 hour (3600 seconds)
- Large file uploads can complete in minutes
- Longer expiry = larger window for URL theft/misuse

**Code:**
```typescript
const presignedResult = await this.s3Service.getPresignedUploadUrl(
  dto.fileName,
  dto.fileType,
  dto.contentType,
  3600,  // ❌ 1 hour = quite long
);
```

**Risk:**
- Intercepted URL could be replayed for hours
- Shared/forwarded URLs could be used by unintended parties
- Increases exposure window if URL is leaked

**Recommended Fix:**
```typescript
// Different expiry for different scenarios
const getPresignedUploadUrl = (
  fileName: string,
  fileType: string,
  contentType: string,
  fileSize: number,
  userId: string,
): Promise<PresignedUploadResult> {
  // Estimate upload time (assume ~10 Mbps upload speed)
  const estimatedUploadSeconds = Math.max(300, fileSize / (10 * 1024 * 1024));

  // Add buffer: estimated time + 5 minutes
  const expirySeconds = Math.min(estimatedUploadSeconds + 300, 900); // Max 15 min

  // ... generate URL with expirySeconds
};
```

**Action Items:**
- ✅ Calculate presigned URL expiry based on file size
- ✅ Set maximum of 15 minutes (900 seconds)
- ✅ Minimum of 5 minutes for small files
- ✅ Add refresh mechanism for long uploads

---

## 🟢 Suggestions

### 10. **No Resume Support for Failed Multipart Uploads**

**Severity:** 🟢 SUGGESTION
**Files:** `apps/web/src/components/media/UploadProgress.tsx:174-175`
**Issue:**
- If part 5 of 10 fails, entire upload is retried from part 1
- No partial resume / resume from failure point
- Wastes bandwidth and time

**Current State:**
```typescript
const canCancel = status === 'pending' || status === 'uploading';
const canRetry = status === 'error' || status === 'cancelled';
// ❌ Retry starts from beginning
```

**Recommendation:**
- Store part ETags persistently
- Allow resume from last successful part
- Check S3 for existing upload state before retrying
- Reduces retransmit time by 50% on average

**Implementation Complexity:** Medium
**Value:** High (better UX, reduced bandwidth)

---

### 11. **Thumbnail Placeholder (LQIP) Not Used**

**Severity:** 🟢 SUGGESTION
**Files:** `apps/api/src/core/media/services/thumbnail.service.ts:277-293`
**Issue:**
- `generateBlurPlaceholder()` creates low-quality image placeholder
- But it's never stored or returned to frontend
- Frontend has to wait for full thumbnail before showing anything

**Recommendation:**
- Generate LQIP (Low Quality Image Placeholder) during upload
- Return as base64 in response for immediate blur display
- Improves perceived performance

```typescript
async completeUpload(
  @CurrentUser() user: any,
  @Body() dto: CompleteUploadDto,
) {
  // ... existing code

  let thumbnail = null;
  let blurPlaceholder = null;

  if (dto.contentType === 'image') {
    thumbnail = await this.generateImageThumbnail(dto.fileKey);
    blurPlaceholder = await this.generateBlurPlaceholder(imageBuffer);
  }

  const media = await this.mediaService.createMediaRecord({
    // ...
    blurPlaceholder,  // ✅ Store LQIP
  });
}
```

---

### 12. **No Automatic Retry Logic for Webhooks**

**Severity:** 🟢 SUGGESTION
**Files:** `apps/api/src/core/media/controllers/mux-webhook.controller.ts`
**Issue:**
- If webhook handler throws, no automatic retry
- Webhook is lost, media record stuck in "uploading"
- Event handler should retry with exponential backoff

**Recommendation:**
- Add dead letter queue (DLQ) for failed webhooks
- Retry with exponential backoff (1s, 2s, 4s, 8s max)
- Store webhooks in database for audit trail
- Alert if webhook fails multiple times

Implementation: Use BullMQ for queue-based webhook processing

---

## Summary Table

| # | Issue | Severity | Impact | Fix Time |
|---|-------|----------|--------|----------|
| 1 | No userId in file paths | 🔴 CRITICAL | Auth bypass, data leak | 2-3h |
| 2 | Webhook not idempotent | 🔴 CRITICAL | Duplicate processing | 2-3h |
| 3 | Orphaned multipart uploads | 🔴 CRITICAL | Cost leakage ($$$) | 1-2h |
| 4 | Public Mux videos | 🔴 CRITICAL | Data exposure | 1-2h |
| 5 | No max file size validation | 🟡 WARNING | DOS/quota abuse | 1h |
| 6 | No timestamp validation | 🟡 WARNING | Replay attacks | 30m |
| 7 | No error notifications | 🟡 WARNING | Poor UX | 2-3h |
| 8 | Magic bytes not enforced | 🟡 WARNING | Malware upload | 1-2h |
| 9 | Presigned URL expiry too long | 🟡 WARNING | URL theft risk | 30m |
| 10 | No multipart resume | 🟢 SUGGESTION | Better UX | 3-4h |
| 11 | No LQIP/blur placeholder | 🟢 SUGGESTION | Perceived perf | 1h |
| 12 | No webhook retry queue | 🟢 SUGGESTION | Reliability | 2-3h |

---

## Media Pipeline Security & Cost Risk Assessment

### Security Posture: ⚠️ MODERATE RISK
- **Strengths:** Presigned URLs, signature verification, file type checking, multipart upload handling
- **Weaknesses:** No user scoping, public videos, missing magic bytes enforcement
- **Data Classification:** Sensitive (user-uploaded media, private videos)
- **Compliance:** GDPR, privacy regulations require fixes to #1 and #4

### Cost Risk: ⚠️ HIGH RISK
- **Orphaned multipart uploads** can leak $5-100/month depending on volume
- **No file size limits** expose to DOS attacks and unbound costs
- **No user quotas** allow unlimited storage claims
- **Recommendation:** Implement #3 (orphaned cleanup) immediately for cost control

### Operational Maturity: ⚠️ NEEDS IMPROVEMENT
- **Missing:** Webhook retry logic, error notifications, monitoring
- **Recommendation:** Implement #7 and #12 for production readiness

---

## Remediation Priority

### Phase 1 - Critical (ASAP, before scale)
1. ✅ Add userId to S3 file paths
2. ✅ Implement webhook idempotency
3. ✅ Add S3 lifecycle policy for orphaned uploads
4. ✅ Fix Mux playback policies

**Estimated Time:** 6-8 hours
**Risk if Not Done:** Potential data breach, uncontrolled costs

### Phase 2 - High Priority (This Sprint)
5. ✅ Add file size validation and quotas
6. ✅ Add error notifications
7. ✅ Enforce magic bytes validation
8. ✅ Fix presigned URL expiry

**Estimated Time:** 4-5 hours
**Risk if Not Done:** DOS attacks, poor user experience

### Phase 3 - Nice to Have (Next Sprint)
9. ✅ Multipart upload resume logic
10. ✅ LQIP blur placeholder
11. ✅ Webhook retry queue with DLQ

**Estimated Time:** 6-7 hours
**Benefit:** Better performance and reliability

---

## Testing Recommendations

After implementing fixes, test:

1. **Authorization Tests**
   - User A cannot access User B's files via guessed paths
   - Presigned URLs reject unauthorized requests

2. **Webhook Idempotency**
   - Send duplicate webhook → verify database updated only once
   - Multiple retries don't create duplicate notifications

3. **Orphaned Upload Cleanup**
   - Initiate upload without completing
   - Verify S3 cleans up after 24 hours
   - Monitor AWS costs before/after

4. **File Size Limits**
   - Upload exceeding 1GB → rejected
   - Per-user quota enforcement working

5. **Magic Bytes Validation**
   - Upload PHP script as JPEG → rejected
   - Polyglot files detected and rejected

---

## Monitoring & Alerting

Implement monitoring for:

```
- Orphaned multipart upload count (alert if > 100)
- Webhook failure rate (alert if > 1%)
- Upload failure rate by error type
- Presigned URL usage patterns (detect abuse)
- Per-user storage quota utilization
- Mux video processing error rate
```

---

## References & Best Practices

- AWS Security Best Practices: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security.html
- Mux Webhook Security: https://docs.mux.com/guides/webhooks
- OWASP Upload Security: https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload
- S3 Multipart Upload Limits: https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html

---

**Audit Completed:** February 27, 2026
**Next Review:** After implementing Phase 1 fixes
