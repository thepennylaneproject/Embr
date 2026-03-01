# Media Domain Audit - Quick Reference

## 🔴 Critical Issues (Fix ASAP)

### 1️⃣ No User Scoping in File Paths
```
❌ Current: images/2024/11/{uuid}-{timestamp}.jpg
✅ Should:  images/2024/11/{userId}/{uuid}-{timestamp}.jpg
```
**Impact:** Authorization bypass - users can enumerate other users' files
**File:** `s3-multipart.service.ts:306-316`

### 2️⃣ Webhooks Not Idempotent
```
Problem: Same webhook delivered twice → DB updated twice
Impact:  Duplicate notifications, data inconsistency
File:    mux-webhook.controller.ts + media.service.ts
```
**Fix:** Add deduplication using `Mux-Id` header

### 3️⃣ Orphaned Multipart Uploads
```
Problem: Failed uploads leave parts in S3
Cost:    100 orphaned GB = $5/month permanent cost
File:    s3-multipart.service.ts (missing cleanup)
```
**Fix:** S3 Lifecycle Policy to abort uploads after 24h

### 4️⃣ Public Mux Videos
```javascript
❌ Current: playbackPolicy: ['public']  // ALWAYS
✅ Should:  playbackPolicy: user.isPrivate ? ['signed'] : ['public']
```
**Impact:** All videos publicly accessible
**File:** `media-upload.controller.ts:135-159`

---

## 🟡 Warnings (Fix This Sprint)

| # | Issue | File | Quick Fix |
|---|-------|------|-----------|
| 5 | No max file size | dto | Add `@Max(1GB)` validator |
| 6 | No timestamp check | mux-video.service | Validate timestamp freshness |
| 7 | No error notify | mux-webhook | Emit event on error |
| 8 | Magic bytes skip | media-upload.controller | Call `checkForMalicious()` |
| 9 | URL expiry 1h | media-upload.controller | Reduce to 15 min max |

---

## 🟢 Suggestions (Nice to Have)

- Resume from last successful part in multipart upload
- LQIP blur placeholder for images
- Webhook retry queue with DLQ

---

## Detailed Findings

**→ See `MEDIA_DOMAIN_AUDIT.md` for full report**

---

## Action Items Checklist

### Phase 1 - CRITICAL (6-8 hours)
- [ ] Add userId to S3 file paths (all storage operations)
- [ ] Implement webhook deduplication with eventId
- [ ] Add S3 Lifecycle Policy for orphaned uploads
- [ ] Fix Mux playback policies (allow private videos)

### Phase 2 - HIGH (4-5 hours)
- [ ] Add file size validation with @Max()
- [ ] Add per-user upload quotas
- [ ] Implement error notifications for failed videos
- [ ] Enforce magic bytes validation on completion
- [ ] Reduce presigned URL expiry to 15 min

### Phase 3 - NICE TO HAVE (6-7 hours)
- [ ] Add multipart upload resume logic
- [ ] Generate and store LQIP blur placeholders
- [ ] Implement webhook retry queue

---

## Risk Summary

| Risk | Current | After Fixes |
|------|---------|------------|
| Authorization | 🔴 BYPASS | ✅ SECURE |
| Cost Leakage | 🔴 $100+/mo | ✅ ~$0 |
| Data Exposure | 🔴 PUBLIC | ✅ PRIVATE |
| Malware Upload | 🟡 POSSIBLE | ✅ BLOCKED |
| Webhook Reliability | 🟡 UNRELIABLE | ✅ RELIABLE |

---

**Full audit report:** `MEDIA_DOMAIN_AUDIT.md`
**Audit date:** Feb 27, 2026
