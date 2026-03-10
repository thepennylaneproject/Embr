# Audit Run: logic-20260310-002636

**Date:** 2025-03-10T00:26:36Z  
**Suite:** logic  
**Agent:** runtime-bug-hunter (LYRA v1.1)  
**Coverage complete:** false (large monorepo, critical paths scanned)  

## Summary

| Metric | Count |
|--------|-------|
| Blockers | 1 |
| Major | 6 |
| Minor | 4 |
| Bugs | 11 |
| Dead Code | 1 |
| Total Findings | 12 |

## Critical Findings

### 🚨 BLOCKER f-log-001: Missing method: getUnreadCountForConversation in MessagingService

**Type:** bug | **Confidence:** Evidence | **Priority:** P0  
**Category:** missing-method

The API build is currently failing because `MessagingService.sendMessage()` (line 508) and `MessagingService.markAsRead()` (line 721) both call `this.getUnreadCountForConversation()`, but this method is never defined in the service. A similar method `getUnreadCount` exists (lines 885-913), but with a different signature.

**Proof:** Build error from `tsc`: "Property 'getUnreadCountForConversation' does not exist on type 'MessagingService'"

**Fix:** Define the missing method:
```typescript
async getUnreadCountForConversation(conversationId: string, userId: string): Promise<number> {
  return this.prisma.message.count({
    where: {
      conversationId,
      senderId: { not: userId },
      status: { not: PrismaMessageStatus.READ }
    }
  });
}
```

**Effort:** 5 minutes

---

## Major Findings

### f-log-002: Potential null dereference in conversation deletion without soft-delete

**Type:** bug | **Confidence:** Inference | **Priority:** P1  
**Category:** error-handling

`deleteConversation()` performs a hard delete without soft-delete support. If the delete fails mid-cascade (e.g., foreign key constraints), the conversation state becomes undefined but no error propagates. The method returns success before confirming database state.

**File:** apps/api/src/verticals/messaging/messaging/services/messaging.service.ts (lines 352-381)

**Fix:** Implement soft-delete or wrap in transaction with error handling.

**Effort:** 20 minutes

---

### f-log-003: Unsafe profile access in follows.service.ts without existence check

**Type:** bug | **Confidence:** Inference | **Priority:** P1  
**Category:** null-ref

`followUser()` increments profile counters (lines 78-86) but `profile.update()` may fail if the profile doesn't exist. Per AGENTS.md, some legacy/seeded users may not have profiles. The `Promise.all` will reject if either profile is missing, leaving the follow record created but profile counters not updated.

**File:** apps/api/src/verticals/feeds/social-graph/services/follows.service.ts (lines 76-86)

**Fix:** Wrap profile updates in try-catch or use updateMany with condition.

**Effort:** 10 minutes

---

### f-log-004: Race condition in idempotency check for checkout

**Type:** bug | **Confidence:** Inference | **Priority:** P1  
**Category:** race-condition

`checkout()` checks for existing orders by `idempotencyKey` (lines 79-90), then proceeds to create new orders. Between check and create, another concurrent request with the same key could race in, both creating orders and resulting in duplicate charges.

**File:** apps/api/src/verticals/marketplace/services/orders.service.ts (lines 72-100)

**Fix:** Move idempotency check inside database transaction with unique constraint.

**Effort:** 20 minutes

---

### f-log-005: Silent notification failure in follows.service.ts

**Type:** bug | **Confidence:** Inference | **Priority:** P2  
**Category:** error-handling

Notification creation is swallowed with `.catch(() => {})`. No logging, no metrics. Users will not know they have new followers if this fails.

**File:** apps/api/src/verticals/feeds/social-graph/services/follows.service.ts (lines 94-104)

**Fix:** Replace silent catch with logging.

**Effort:** 5 minutes

---

### f-log-006: Unsafe access to messages[0] in markAsRead without bounds check

**Type:** bug | **Confidence:** Inference | **Priority:** P2  
**Category:** null-ref

`markAsRead()` accesses `conversation.messages[0]` (line 734) without checking if the array exists or has elements. Will cause type errors in response if empty.

**File:** apps/api/src/verticals/messaging/messaging/services/messaging.service.ts (lines 734-755)

**Fix:** Add null-coalescing: `lastMessage: conversation.messages[0] ? { ... } : null`

**Effort:** 5 minutes

---

### f-log-007: Missing await on rate limiter check

**Type:** bug | **Confidence:** Inference | **Priority:** P1  
**Category:** async-bug

`sendMessage()` calls `this.rateLimiter.isAllowed()` without `await` (line 445). If the method is async (which rate limiters typically are), the check is skipped entirely and rate limiting is bypassed. Users can spam unlimited messages.

**File:** apps/api/src/verticals/messaging/messaging/services/messaging.service.ts (lines 444-449)

**Fix:** Add `await`: `if (!(await this.rateLimiter.isAllowed(...)))`

**Effort:** 5 minutes

---

### f-log-008: Unsafe property access in message sender mapping

**Type:** bug | **Confidence:** Inference | **Priority:** P2  
**Category:** null-ref

`sendMessage()` maps `message.sender` without null check (lines 500-503). Uses unsafe `any` casts which mask type errors. If sender is not included in query result (possible after refactoring), will throw.

**File:** apps/api/src/verticals/messaging/messaging/services/messaging.service.ts (lines 486-505)

**Fix:** Remove `any` casts and add guard: `if (!message.sender) throw new Error(...)`

**Effort:** 10 minutes

---

## Minor Findings

### f-log-009: Unhandled promise rejection in useMessaging hook error callback

**Type:** bug | **Confidence:** Inference | **Priority:** P2  
**Category:** error-handling

`fetchConversations()` calls `onError` callback then re-throws (lines 297-315). Unclear error handling flow.

**File:** apps/web/src/hooks/useMessaging.ts (lines 297-315)

**Fix:** Clarify error handling - either remove re-throw or ensure caller handles it.

**Effort:** 5 minutes

---

### f-log-010: Unsafe access to response.message in createConversation hook

**Type:** bug | **Confidence:** Inference | **Priority:** P3  
**Category:** null-ref

`createConversation()` assumes `response.message` exists (line 333), but API may return null. Will render undefined in UI.

**File:** apps/web/src/hooks/useMessaging.ts (lines 326-338)

**Fix:** Use optional chaining: `response.message || null`

**Effort:** 3 minutes

---

### f-log-011: Unreachable code in markAsRead hook

**Type:** dead_code | **Confidence:** Inference | **Priority:** P3  
**Category:** dead-code

`markAsRead()` has unclear control flow (lines 425-464). Logic for socket vs HTTP fallback is not explicit, potentially creating dead code paths.

**File:** apps/web/src/hooks/useMessaging.ts (lines 425-464)

**Fix:** Add explicit if-else to clarify socket vs HTTP flow.

**Effort:** 10 minutes

---

### f-log-012: Unsafe access to data.conversationId in setMessages state update

**Type:** bug | **Confidence:** Inference | **Priority:** P3  
**Category:** validation

`markAsRead()` state update (lines 158-168) doesn't validate `data.conversationId` exists. While `|| []` fallback is safe, it indicates potential data inconsistency.

**File:** apps/web/src/hooks/useMessaging.ts (lines 158-168)

**Fix:** Add validation or logging if conversationId is missing.

**Effort:** 3 minutes

---

## Coverage Report

**Examined:** 25 files (messaging service, follows service, orders service, useMessaging hook, auth patterns, API client)  
**Skipped:** 50 files (test files, build config, CSS files excluded per scope)  
**Complete:** false  
**Reason:** Large monorepo (77+ service files). Scanned critical paths (messaging, auth, posts, feeds, gigs, marketplace, hooks, API client).

---

## Next Actions

1. **URGENT - FIX NOW:** Implement `getUnreadCountForConversation()` method in MessagingService (f-log-001)
2. **P1:** Fix race condition in checkout idempotency (f-log-004)
3. **P1:** Add missing `await` on rate limiter (f-log-007)
4. **P1:** Add profile existence checks in follows (f-log-003)
5. **P1:** Implement soft-delete in conversation deletion (f-log-002)
6. **P2:** Add logging to notification failures (f-log-005)
7. **P2:** Standardize null-coalescing in message methods (f-log-006, f-log-008)
8. **P2:** Clarify error handling in useMessaging hook (f-log-009, f-log-011, f-log-012)
