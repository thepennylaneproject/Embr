# Embr Messaging Domain Code Audit Report

**Date**: 2026-02-27  
**Scope**: Direct messaging system with WebSocket real-time delivery  
**Files Audited**: 11 backend/frontend files + types

---

## Executive Summary

The messaging domain demonstrates **solid authorization and data persistence practices**, with JWT-protected endpoints and database-backed message integrity. However, **critical gaps in rate limiting**, **multi-instance scaling**, and **event validation** create operational and security risks for a production creator platform.

---

## 🔴 CRITICAL FINDINGS

### 1. **Missing Rate Limiting on Message Send** `messaging.service.ts`
**Severity**: Critical  
**Lines**: 366-495 (sendMessage method)

**Issue**:  
The `sendMessage` endpoint has no rate limiting. A malicious user or compromised client can:
- Flood a conversation with thousands of messages per second
- Cause message queue buildup and database strain
- Enable abuse/spam vectors

**Current State**:
```typescript
async sendMessage(userId: string, dto: SendMessageDto): Promise<SendMessageResponse> {
  // ... validation checks exist ...
  // BUT NO RATE LIMITING
  const message = await this.prisma.message.create({...});
```

**Constraints Defined but Not Used**:
```typescript
// messaging.types.ts:310
MAX_MESSAGES_PER_MINUTE: 60,
```

**Recommendation**:
- Implement token bucket or sliding window rate limiter on message send
- Rate limit per user + per conversation pair
- Return 429 Too Many Requests when exceeded
- Log rate limit violations for abuse detection
- Start with: 60 messages/minute per user, 100/minute per conversation

---

### 2. **No Multi-Instance Scaling Support (Redis Adapter Missing)** `messaging.gateway.ts`
**Severity**: Critical  
**Lines**: 38-44 (WebSocketGateway decorator)

**Issue**:  
The WebSocket gateway uses in-memory socket tracking (`userSockets` map at line 52) with **no Redis adapter**. This means:
- Only works on a single server instance
- Cannot scale horizontally for high-volume conversations
- User tracking is lost when server restarts
- Broadcast events don't reach clients on different servers

**Current Implementation**:
```typescript
@WebSocketGateway({
  cors: { origin: process.env.ALLOWED_ORIGINS?.split(',') },
  namespace: '/messaging',
  // ❌ MISSING: adapter: new RedisIoAdapter()
})
export class MessagingGateway {
  private userSockets: Map<string, Set<string>> = new Map(); // In-memory only
}
```

**Recommendation**:
- Install `@socket.io/redis-adapter` and `redis` packages
- Implement RedisIoAdapter in `messaging.module.ts`:
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

// In module factory or app initialization
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```
- Update user tracking to use Redis instead of in-memory Map
- Test with multi-instance deployment simulation

---

### 3. **Weak WebSocket Event Validation - Typing/Delivery Events** `messaging.gateway.ts`
**Severity**: Critical  
**Lines**: 187-218 (handleMessageDelivered), 311-364 (handleTypingStart/Stop)

**Issue**:  
Typing and delivery handlers don't validate that the user is actually a participant in the conversation. A user can:
- Spy on typing indicators from conversations they're not part of
- Send fake delivery confirmations for other users' messages
- Receive events about private conversations

**Current Code** (handleTypingStart):
```typescript
async handleTypingStart(
  @ConnectedSocket() client: AuthenticatedSocket,
  @MessageBody() dto: TypingIndicatorDto,
) {
  // ❌ NO VALIDATION: doesn't check if client.userId is participant in conversation
  const { conversationId } = dto;
  const conversations = await this.messagingService.getConversations(client.userId, {});
  const conversation = conversations.conversations.find((c) => c.id === conversationId);
  if (!conversation) return; // Silent fail - but what if user spoofs conversationId?
```

**Vulnerability**: A user can emit typing for ANY conversationId without validation.

**Recommendation**:
- Add conversation membership validation in both handlers:
```typescript
async handleTypingStart(
  @ConnectedSocket() client: AuthenticatedSocket,
  @MessageBody() dto: TypingIndicatorDto,
) {
  const { conversationId } = dto;
  
  // VALIDATE conversation exists and user is participant
  const conversation = await this.messagingService.validateConversationAccess(
    client.userId!,
    conversationId,
  );
  if (!conversation) {
    client.emit(WebSocketEvent.ERROR, {
      code: 'UNAUTHORIZED',
      message: 'Not a participant in this conversation',
    });
    return;
  }
  // ... proceed with typing indicator
}
```
- Add `validateConversationAccess` method to MessagingService

---

### 4. **No Block Status Check in Conversation Creation** `messaging.service.ts`
**Severity**: Critical  
**Lines**: 182-256 (getOrCreateConversation)

**Issue**:  
Creating conversations doesn't check if either user has blocked the other. Users can:
- Create conversations with users who have blocked them
- Bypass block functionality entirely
- Send unsolicited messages despite being blocked

**Current Code**:
```typescript
async getOrCreateConversation(userId: string, dto: CreateConversationDto) {
  const { participantId } = dto;
  
  // Checks self-messaging and user exists
  if (userId === participantId) {
    throw new BadRequestException('Cannot create conversation with yourself');
  }
  
  const participant = await this.prisma.user.findUnique({where: {id: participantId}});
  if (!participant) {
    throw new NotFoundException('User not found');
  }
  
  // ❌ NO CHECK: doesn't verify neither user has blocked the other
```

**Recommendation**:
- Add `Block` model check (assuming safety system exists):
```typescript
// Check if either user has blocked the other
const hasBlock = await this.prisma.block.findFirst({
  where: {
    OR: [
      { blockerId: userId, blockedId: participantId },
      { blockerId: participantId, blockedId: userId },
    ],
  },
});

if (hasBlock) {
  throw new ForbiddenException(
    'Cannot create conversation. One user may have blocked the other.',
  );
}
```
- Apply same check in `sendMessage` when creating conversation via recipientId

---

## 🟡 WARNINGS

### 5. **Faulty Delivery Confirmation Logic** `messaging.gateway.ts:168-173`
**Severity**: Warning  
**Lines**: 168-173 (handleSendMessage)

**Issue**:  
Auto-marking as delivered relies on `isUserOnline()` check, which is unreliable:
- Doesn't account for network latency
- User might appear online but socket not ready
- Breaks in multi-instance deployments (isUserOnline only knows about local instance)

```typescript
// Auto-mark as delivered if recipient is online
if (this.isUserOnline(recipientId)) {
  await this.handleMessageDelivered(client, {
    messageId: result.message.id,
    conversationId: result.conversation.id,
  });
}
```

**Recommendation**:
- Remove automatic delivery marking
- Require explicit delivery confirmation from recipient's client
- Implement proper delivery receipt flow:
  1. Server sends MESSAGE_RECEIVE to recipient
  2. Client emits MESSAGE_DELIVERED confirmation
  3. Server marks as DELIVERED and notifies sender

---

### 6. **Hard Delete on Conversation Deletion** `messaging.service.ts:355`
**Severity**: Warning  
**Lines**: 331-360 (deleteConversation)

**Issue**:  
Conversations are hard-deleted, which:
- Loses audit trail for deleted conversations
- Prevents recovery/restoration
- Doesn't respect data retention policies
- Can't distinguish "deleted by user A" from "deleted by user B"

```typescript
// ❌ Hard delete
await this.prisma.conversation.delete({
  where: { id: conversationId },
});
```

**Recommendation**:
- Implement soft delete with per-user visibility:
```typescript
// Add fields to Conversation model:
// - deletedByParticipant1At: DateTime?
// - deletedByParticipant2At: DateTime?

// In getConversations, filter out soft-deleted:
where: {
  OR: [
    { participant1Id: userId, deletedByParticipant1At: null },
    { participant2Id: userId, deletedByParticipant2At: null },
  ],
}

// In deleteConversation:
await this.prisma.conversation.update({
  where: { id: conversationId },
  data: userId === conv.participant1Id 
    ? { deletedByParticipant1At: new Date() }
    : { deletedByParticipant2At: new Date() }
});
```

---

### 7. **Unvalidated Message Metadata Field** `messaging.dto.ts:98-104`
**Severity**: Warning  
**Lines**: 98-104 (SendMessageDto)

**Issue**:  
The `metadata` field is declared as `Record<string, any>` with no constraints. Could contain:
- Arbitrarily large objects causing DB bloat
- Malicious data structures
- Injection payloads

```typescript
@IsOptional()
@IsObject()
metadata?: Record<string, any>;  // ❌ No validation
```

**Recommendation**:
- Add JSON schema validation:
```typescript
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@IsOptional()
@ValidateNested()
@Type(() => Object)
@IsObject()
// Limit to known metadata keys only
metadata?: {
  replyToId?: string;
  editedAt?: string;
  // ... whitelist specific fields
};
```

---

### 8. **Fragile JWT Token Extraction** `messaging.gateway.ts:71-73`
**Severity**: Warning  
**Lines**: 71-79 (handleConnection)

**Issue**:  
Token extraction checks `auth.token` OR `authorization` header, but the header parsing is simplistic:

```typescript
const token =
  client.handshake.auth.token ||
  client.handshake.headers.authorization?.replace('Bearer ', '');
  
// ❌ ISSUES:
// - If both are present, uses auth.token (could be stale)
// - Simple string replace doesn't validate format
// - Malformed token still attempts verification
```

**Recommendation**:
- Prioritize authorization header (standard OAuth2):
```typescript
let token: string | undefined;

// Check header first (standard approach)
const authHeader = client.handshake.headers.authorization;
if (authHeader?.startsWith('Bearer ')) {
  token = authHeader.slice(7); // Remove 'Bearer ' prefix
}

// Fall back to auth.token for WebSocket-native clients
if (!token && typeof client.handshake.auth.token === 'string') {
  token = client.handshake.auth.token;
}

if (!token) {
  this.logger.warn(`Client ${client.id} rejected: No valid token`);
  client.disconnect();
  return;
}
```

---

### 9. **Missing Conversation Membership Validation in Typing** `messaging.gateway.ts:311-364`
**Severity**: Warning  
**Lines**: 317-334 (handleTypingStart)

**Issue**:  
After finding conversation, code doesn't validate the user is actually a participant. The `getConversations` call could return empty result for non-participants, but no proper error is sent.

```typescript
const conversation = conversations.conversations.find(
  (c) => c.id === conversationId,
);
if (!conversation) return;  // ❌ Silent return - no error to client
```

**Recommendation**:
- Implement explicit check (see Critical #3 above)

---

### 10. **No Edit History Tracking** `messaging.types.ts`
**Severity**: Warning (Medium impact on accountability)

**Issue**:  
Messages are soft-deleted but not edited. If edit functionality is added later, edit history is lost. Current metadata doesn't track edit versioning.

**Recommendation**:
- Add edit history support now:
```typescript
// messaging.types.ts
interface Message {
  editHistory?: Array<{
    editedAt: string;
    previousContent: string;
  }>;
}

// messaging.service.ts - future edit method
async editMessage(userId: string, messageId: string, newContent: string) {
  const message = await this.prisma.message.findUnique({where: {id: messageId}});
  
  if (message.senderId !== userId) {
    throw new ForbiddenException('Can only edit own messages');
  }
  
  const editHistory = message.metadata?.editHistory || [];
  editHistory.push({
    editedAt: new Date().toISOString(),
    previousContent: message.content,
  });
  
  return this.prisma.message.update({
    where: {id: messageId},
    data: {
      content: newContent,
      metadata: {...message.metadata, editHistory},
    },
  });
}
```

---

## 🟢 SUGGESTIONS

### 11. **Implement Security Event Logging** `messaging.gateway.ts`, `messaging.service.ts`
**Impact**: Medium (Incident response, compliance)

**Suggestion**:  
Add structured logging for security events:

```typescript
// In handleConnection
this.logger.log({
  event: 'WEBSOCKET_AUTH_SUCCESS',
  userId: client.userId,
  ip: client.handshake.address,
  timestamp: new Date().toISOString(),
});

// In sendMessage
this.logger.log({
  event: 'MESSAGE_SEND',
  senderId: client.userId,
  conversationId: conversation.id,
  recipientId,
  messageSize: dto.content?.length || 0,
  hasMedia: !!dto.mediaUrl,
});

// In deleteMessage
this.logger.log({
  event: 'MESSAGE_DELETE',
  userId,
  messageId,
  conversationId: dto.conversationId,
});
```

**Implementation**:
- Use a structured logger (Winston, Pino) that sends to ELK/CloudWatch
- Include correlation IDs for tracing

---

### 12. **Implement Explicit WebSocket Reconnection Handler** `useMessaging.ts`
**Impact**: Low (UX improvement)

**Current**: Socket.io auto-reconnects by default, but implicit.

**Suggestion**:
```typescript
// apps/web/src/hooks/useMessaging.ts:91-106
newSocket.on('disconnect', (reason) => {
  console.log('WebSocket disconnected:', reason);
  setIsConnected(false);

  // Explicit reconnection logging
  if (reason === 'io server disconnect') {
    // Server disconnected user - should not auto-reconnect
    this.logger.warn('Server initiated disconnect');
  } else if (reason === 'io client namespace disconnect') {
    // Client disconnect - OK to reconnect
    this.logger.log('Client disconnected, will reconnect');
  }
});
```

---

### 13. **Add Message Batch Read Confirmation** `messaging.gateway.ts:268-305`
**Impact**: Low (Performance/reliability)

**Current**: `MESSAGE_BULK_READ` broadcasts but doesn't acknowledge receipt.

**Suggestion**:
- Use socket.io acknowledgment callbacks:
```typescript
@SubscribeMessage(WebSocketEvent.MESSAGE_BULK_READ)
async handleBulkMarkAsRead(
  @ConnectedSocket() client: AuthenticatedSocket,
  @MessageBody() data: {conversationIds: string[]},
) {
  // ... bulk mark as read ...
  
  // Send acknowledgment with confirmation
  return {
    success: true,
    updatedConversationCount: results.length,
    timestamp: new Date().toISOString(),
  };
}

// Frontend
socket.emit(
  WebSocketEvent.MESSAGE_BULK_READ,
  {conversationIds},
  (response) => {
    if (response.success) {
      console.log('Bulk read confirmed');
    }
  }
);
```

---

### 14. **Archive File Cleanup** `apps/web/.archive/duplicates/messages.tsx`
**Impact**: Negligible (Code cleanliness)

**Finding**:  
File contains dead placeholder code - is not imported anywhere:

```typescript
// apps/web/.archive/duplicates/messages.tsx (12 lines)
export default function MessagesPage() {
  return <FeaturePlaceholder title="Messages" ... />;
}
```

**Current Active Implementation**: `apps/web/src/pages/messages/index.tsx`

**Recommendation**:  
Safe to delete - confirmed no imports from this file exist in the codebase.

---

### 15. **Add Conversation Activity Timestamps** `messaging.types.ts`
**Impact**: Low (Future compliance features)

**Suggestion**:  
Track read-at timestamps per participant:

```typescript
interface Conversation {
  // ... existing fields ...
  participant1LastReadAt?: string;
  participant2LastReadAt?: string;
  participant1LastTypingAt?: string;
  participant2LastTypingAt?: string;
}
```

Enables: "last seen" features, typing state accuracy, compliance reports.

---

### 16. **Implement Message Delivery Metrics** 
**Impact**: Low (Observability)

**Suggestion**:  
Track delivery success rate:
- Messages sent → delivered → read pipeline
- Timeout statistics
- Failed delivery retry behavior

```typescript
interface MessageDeliveryMetric {
  messageId: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  recipientId: string;
  status: 'PENDING' | 'DELIVERED' | 'READ' | 'FAILED';
}
```

---

## ✅ STRENGTHS

### What's Working Well:

1. **Authorization Checks** ✓  
   - All REST endpoints properly validate conversation membership before returning data
   - Good use of JWT + NestJS AuthGuard pattern

2. **Message Persistence** ✓  
   - Messages are persisted to database before broadcast
   - Prevents loss on socket disconnect

3. **Input Validation** ✓  
   - DTOs with class-validator enforce message length (5000 chars), file types, file size (50MB)
   - UUID validation on all IDs

4. **Pagination Enforcement** ✓  
   - All list endpoints paginate with reasonable defaults (20-50 items, max 100)
   - Prevents bulk data exfiltration

5. **Soft Message Deletion** ✓  
   - Messages aren't hard-deleted; content is replaced with metadata flag
   - Maintains referential integrity and conversation thread

6. **Message Status Tracking** ✓  
   - Tracks SENT → DELIVERED → READ states
   - Supports read receipts via WebSocket events

7. **Frontend Connection Management** ✓  
   - MessageInput properly disables on `isSending` flag
   - Auto-scroll on new messages
   - Error boundaries with user feedback

---

## Summary Table

| Severity | Finding | Quick Fix | Effort |
|----------|---------|-----------|--------|
| 🔴 Critical | No rate limiting | Add token bucket limiter | 2-4 hours |
| 🔴 Critical | No Redis adapter | Install `@socket.io/redis-adapter` | 3-6 hours |
| 🔴 Critical | Weak WS validation | Add conversation membership check | 1-2 hours |
| 🔴 Critical | No block check | Query Block model in createConversation | 1-2 hours |
| 🟡 Warning | Faulty delivery logic | Switch to receipt-based flow | 4-6 hours |
| 🟡 Warning | Hard conversation delete | Add soft delete per participant | 2-3 hours |
| 🟡 Warning | Unvalidated metadata | Add JSON schema validation | 1 hour |
| 🟡 Warning | Token extraction | Standardize to Bearer header first | 30 min |
| 🟢 Suggestion | Security logging | Add structured logging | 2-3 hours |
| 🟢 Suggestion | Reconnect handler | Add disconnect reason logging | 30 min |
| 🟢 Suggestion | Archive cleanup | Delete dead placeholder | 5 min |

---

## Messaging Reliability & Security Posture

**Reliability**: **7/10**  
- ✓ Data is persisted
- ✓ Pagination prevents bulk requests
- ✓ Soft deletes preserve history
- ⚠️ No multi-instance scaling
- ⚠️ Delivery confirmation unreliable
- ⚠️ No rate limiting (DoS risk)

**Security**: **6/10**  
- ✓ JWT authentication on WebSocket
- ✓ Authorization checks on REST endpoints
- ⚠️ Weak WebSocket event validation
- ⚠️ No block enforcement
- ⚠️ No rate limiting (spam/abuse)
- ⚠️ Single-instance only (not prod-ready)

**Recommendation**: Deploy the 4 critical fixes before production load testing.

---

**Report Generated**: 2026-02-27  
**Auditor**: Claude Code Analysis
