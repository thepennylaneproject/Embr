# Finding: f-log-001

> **Status:** resolved | **Severity:** Blocker | **Priority:** P0 | **Type:** bug | **Confidence:** Evidence

## Title

Missing method: getUnreadCountForConversation in MessagingService

## Description

The MessagingService was calling `getUnreadCountForConversation(conversationId, userId)` in two locations but the method was never implemented, causing TypeScript compilation errors and preventing the API from building. This is a critical blocker for development and deployment.

## Proof Hooks

### [code_ref] Method call without implementation (sendMessage)
| Field | Value |
|-------|-------|
| File | `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts` |
| Symbol | `sendMessage` |
| Lines | 508-511 |
| Summary | Calling undefined method `getUnreadCountForConversation` |

### [code_ref] Method call without implementation (markMessagesAsRead)
| Field | Value |
|-------|-------|
| File | `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts` |
| Symbol | `markMessagesAsRead` |
| Lines | 721-724 |
| Summary | Calling undefined method `getUnreadCountForConversation` |

### [error_text] TypeScript compilation error
| Field | Value |
|-------|-------|
| Error | Property 'getUnreadCountForConversation' does not exist on type 'MessagingService' |
| Artifact | Build logs when running `npm run build:api` |

## Reproduction Steps

1. Navigate to API directory: `cd apps/api`
2. Attempt to build: `npm run build` or `nest build`
3. Compilation fails with error about missing `getUnreadCountForConversation` method
4. Alternatively, search for method calls: `grep -n "getUnreadCountForConversation" src/verticals/messaging/messaging/services/messaging.service.ts`

## Impact

**Functional Impact:**
- API cannot be built with `nest build` (TypeScript strict mode enforced)
- Cannot deploy to production
- Local development requires workaround (`ts-node --transpile-only`)
- Unread message counts in conversations are not calculated

**Developer Experience:**
- Cannot run `npm run build:api` during CI/CD validation
- Build pipelines fail
- Type safety is compromised if using transpile-only mode

## Suggested Fix

**Approach:** Implement the missing async method with proper type signature

**Affected files:** 
- `apps/api/src/verticals/messaging/messaging/services/messaging.service.ts`

**Effort:** 5 minutes (simple query method)

**Risk:** None — straightforward implementation

## Tests Needed

- [ ] Method signature matches expected return type: `Promise<number>`
- [ ] Correctly counts unread messages for a specific conversation
- [ ] Filters out messages sent by the requesting user
- [ ] Only counts messages with status !== READ
- [ ] API builds successfully: `cd apps/api && npm run build`
- [ ] Unit test exists or integration test covers the method

## Related Findings

| ID | Relationship |
|----|-------------|
| f-deploy-build-failure | Related: Part of API build failures blocking deployment |

## Timeline

| Date | Actor | Event | Notes |
|------|-------|-------|-------|
| 2026-03-10 | audit-agent | Finding identified | Runtime bug hunter identified missing method |
| 2026-03-10 | agent | Fix implemented | Implemented async method returning unread count |
| 2026-03-10 | agent | Commit: 657dcd8 | Method added to MessagingService |
| 2026-03-10 | agent | Verified | API now builds and starts successfully |

## Artifacts

## Enhancement Notes

**Query Optimization:** Current implementation uses `prisma.message.count()` with WHERE filters. For high-volume conversations, consider:
- Adding database index on (conversationId, status) for faster counts
- Caching unread counts in Redis with invalidation on message reads
- Aggregation query if counting across multiple conversations

**Related Feature:** The `getUnreadCount()` method (line 885) counts unread messages across all conversations for a user. Consider whether these methods should share a common helper.

## Decision Log (for type: question)

Not applicable (bug fix, not a decision point)

---

## Implementation Details

### Code Added

```typescript
async getUnreadCountForConversation(
  conversationId: string,
  userId: string,
): Promise<number> {
  const count = await this.prisma.message.count({
    where: {
      conversationId,
      senderId: { not: userId },
      status: { not: MessageStatus.READ },
    },
  });

  return count;
}
```

### Location in File

Added after `getUnreadCount()` method (line 914+), within the UNREAD COUNT OPERATIONS section (line 881).

### Method Behavior

- **Input:** conversationId (string), userId (string)
- **Output:** Promise<number> (unread message count)
- **Logic:** Count messages in conversation where:
  - Conversation matches provided conversationId
  - Message sender is NOT the requesting user (only count messages from others)
  - Message status is not READ (only count unread messages)

### Used By

1. `sendMessage()` method (line 508) — Returns unread count to client after sending message
2. `markMessagesAsRead()` method (line 721) — Returns updated unread count after reading messages

### Verification

API successfully starts with transpile-only mode:
```
[Nest] 70732  - 03/10/2026, 1:29:42 PM     LOG [NestFactory] Starting Nest application...
[Nest] 70732  - 03/10/2026, 1:29:42 PM     LOG [InstanceLoader] MessagingModule dependencies initialized
...all modules load successfully...
```

