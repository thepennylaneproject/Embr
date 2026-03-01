# Content Domain Audit Report
**Embr Social Platform - Creator Content & Engagement System**
**Date:** February 27, 2026
**Status:** Complete

---

## Executive Summary

The Content domain audit examined posts, comments, likes, feeds, and the social graph (follows). **4 critical issues** and **7 warnings** were identified. The most concerning gaps are missing block list enforcement, lack of content sanitization, and incomplete comment cascade deletion. The feed uses offset-based pagination (suitable for current scale) but lacks caching. Frontend components properly implement optimistic updates with good cleanup practices.

---

## 🔴 Critical Issues

### 1. **No Block List Filtering in Feed API**
**File:** `apps/api/src/verticals/feeds/content/services/posts.service.ts`
**Lines:** 155-233 (getFeed, getFollowingFeed)

**Issue:**
Posts from blocked users are included in feed results at the API level. Only visibility checks exist (PUBLIC, FOLLOWERS, PRIVATE), but no exclusion for users who have blocked the current user or whom the current user has blocked.

**Risk:**
- Users can see content from people who blocked them
- Blocked users' posts still appear in feeds
- Violates user privacy expectations

**Recommended Fix:**
```typescript
// In getFeed and getFollowingFeed methods:
// Join against Block table to filter out:
// 1. Users who blocked current user
// 2. Users current user has blocked

const where: any = {
  deletedAt: null,
  AND: [
    {
      author: {
        NOT: {
          blockedBy: { some: { blockerId: userId || 'null' } },
        },
      },
    },
    {
      author: {
        NOT: {
          blocking: { some: { blockingId: userId || 'null' } },
        },
      },
    },
  ],
  OR: [ /* existing visibility logic */ ],
};
```

---

### 2. **Missing Content Sanitization - XSS Vulnerability**
**Files:**
- `apps/api/src/verticals/feeds/content/dto/create-post.dto.ts` (lines 19-23)
- `apps/web/src/components/content/PostCard.tsx` (lines 108-112)

**Issue:**
Post content is stored and rendered as plain text without HTML sanitization. While the current implementation renders text as text (safe in React), there's no validation preventing HTML injection in the database. If rendering logic changes to use `dangerouslySetInnerHTML` or a WYSIWYG editor is added, this becomes critical.

**Risk:**
- Database contains unsanitized user input
- Future renderers could expose stored XSS vulnerability
- Comment content has same issue (500 char limit doesn't mitigate HTML attacks)

**Recommended Fix:**
```typescript
// In create-post.dto.ts
import DOMPurify from 'isomorphic-dompurify';

@IsString()
@IsOptional()
@MaxLength(5000)
sanitizeContent() {
  // Use setter to sanitize on assignment
  const sanitized = DOMPurify.sanitize(this.content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  return sanitized;
}

// Same for comments.dto.ts
```

**Or at API entry point:**
```typescript
// In posts.controller.ts createPost method
const sanitizedContent = DOMPurify.sanitize(createPostDto.content);
```

---

### 3. **Comment Deletion Doesn't Cascade - Orphaned Replies**
**File:** `apps/api/src/verticals/feeds/content/services/comments.service.ts`
**Lines:** 244-275 (deleteComment method)

**Issue:**
When a parent comment is deleted, reply comments remain in the database with a `parentId` pointing to a non-existent comment. Replies are marked as deleted but parent doesn't delete children.

**Risk:**
- Database inconsistency: orphaned comments with dangling parentId references
- Reply counts become inaccurate
- If soft-deleted comments are ever queried, orphaned replies could resurface
- Cascading deletions not implemented

**Recommended Fix:**
```typescript
async deleteComment(commentId: string, userId: string) {
  const comment = await this.prisma.comment.findUnique({
    where: { id: commentId, deletedAt: null },
  });

  if (!comment) {
    throw new NotFoundException('Comment not found');
  }

  if (comment.authorId !== userId) {
    throw new ForbiddenException('Not authorized to delete this comment');
  }

  // Soft delete this comment and all replies
  await this.prisma.comment.updateMany({
    where: {
      OR: [
        { id: commentId },
        { parentId: commentId, deletedAt: null }, // Cascade to replies
      ],
    },
    data: { deletedAt: new Date() },
  });

  // Update comment count for all affected levels
  await this.prisma.post.update({
    where: { id: comment.postId },
    data: { commentCount: { decrement: 1 } }, // Could be higher if cascading
  });

  this.eventEmitter.emit('comment.deleted', {
    commentId,
    postId: comment.postId,
    authorId: userId,
  });
}
```

---

### 4. **No Tombstone Implementation for Deleted Comments**
**Files:**
- `apps/api/src/verticals/feeds/content/services/comments.service.ts` (lines 244-275)
- `apps/api/src/verticals/feeds/content/controllers/comments.controller.ts` (lines 56-76, getComments)

**Issue:**
Comments are soft-deleted but the API fully filters them out (WHERE `deletedAt: null`). This means deleted comments vanish from threads, breaking conversation flow and reply chains. No tombstone ("This comment was removed") placeholder is shown.

**Risk:**
- Users see conversations with gaps
- Reply counts don't match visible replies
- Poor UX: "View 5 replies" but only 3 are shown
- Thread context lost

**Recommended Fix:**
```typescript
// Modify formatComment to show tombstone for deleted comments
private async formatComment(comment: any, userId?: string) {
  // If comment is deleted, return tombstone
  if (comment.deletedAt) {
    return {
      id: comment.id,
      postId: comment.postId,
      content: '[This comment was removed]',
      isDeleted: true,
      authorId: comment.authorId,
      author: null, // Don't expose author info
      likeCount: 0,
      replyCount: comment._count?.replies || 0,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  // ... normal formatting
}

// Update getComments to NOT filter deleted comments
// This preserves thread structure
const where = {
  postId,
  parentId: parentId || null,
  // Remove: deletedAt: null
};
```

---

## 🟡 Warnings

### 1. **Feed Uses Offset Pagination Instead of Cursor-Based**
**Files:**
- `apps/api/src/verticals/feeds/content/services/posts.service.ts` (lines 155-233)
- `apps/api/src/verticals/feeds/content/controllers/posts.controller.ts` (lines 52-70)

**Issue:**
Feed pagination uses `page` and `limit` with calculated `skip` offset. This approach has known issues at scale:
- **Consistency:** New posts inserted between pages cause duplicates or skips
- **Performance:** Large offsets (`skip: 1,000,000`) are expensive
- **Missing data:** User sees same post on pages 2 and 3 if new content added

**Current Implementation (Problematic):**
```typescript
const skip = (page - 1) * limit;
const posts = await prisma.post.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } });
```

**Severity:** Medium (works for current scale with <1M posts, but degrades)

**Recommended Fix:**
Implement cursor-based pagination:
```typescript
// Controller
@Get('feed')
async getFeed(
  @Query('cursor') cursor?: string,
  @Query('limit') limit: string = '20',
) {
  return this.postsService.getFeed(
    { cursor, limit: Math.min(parseInt(limit), 50) },
    userId,
  );
}

// Service
async getFeed(params: { cursor?: string; limit: number }, userId?: string) {
  const where = { deletedAt: null, /* ... */ };

  const posts = await this.prisma.post.findMany({
    where: {
      ...where,
      ...(cursor && { createdAt: { lt: new Date(cursor) } }), // Cursor = timestamp
    },
    take: params.limit + 1, // +1 to check hasMore
    orderBy: { createdAt: 'desc' },
  });

  const hasMore = posts.length > params.limit;
  const data = posts.slice(0, params.limit);
  const nextCursor = data.length ? data[data.length - 1].createdAt.toISOString() : null;

  return { data, nextCursor, hasMore };
}

// Frontend update needed in useFeed hook
```

---

### 2. **No Caching Layer for Feed Generation**
**File:** `apps/api/src/verticals/feeds/content/services/posts.service.ts` (lines 155-233)

**Issue:**
Public feed results are generated fresh on every request despite being mostly static. For large user bases, this causes redundant database queries and slow response times.

**Severity:** Medium (impacts all users, especially unauthenticated)

**Recommended Fix:**
```typescript
// Add Redis caching (e.g., 60 seconds)
async getFeed(params: { page: number; limit: number }, userId?: string) {
  const cacheKey = `feed:public:page:${params.page}:limit:${params.limit}`;

  // Check cache
  const cached = await this.cacheService.get(cacheKey);
  if (cached) return cached;

  // Generate fresh
  const result = { /* existing logic */ };

  // Cache for 60 seconds (only for public/non-user feeds)
  if (!userId) {
    await this.cacheService.set(cacheKey, result, 60);
  }

  return result;
}
```

---

### 3. **Likes Service Allows Self-Likes (No User-Facing Prevention)**
**File:** `apps/api/src/verticals/feeds/content/services/likes.service.ts` (lines 24-70)

**Issue:**
The API accepts likes from users on their own posts. While it prevents notifications for self-likes (line 57), it doesn't prevent the like itself. Users can artificially inflate their own post metrics.

**Severity:** Low (mitigated by frontend, but no API enforcement)

**Current Code:**
```typescript
// Only skips notification, doesn't prevent like
if (post.authorId !== userId) {
  this.eventEmitter.emit('post.liked', { /* ... */ });
}
```

**Recommended Fix:**
```typescript
async likePost(postId: string, userId: string) {
  const post = await this.prisma.post.findFirst({ /* ... */ });

  // Prevent self-likes
  if (post.authorId === userId) {
    throw new BadRequestException('You cannot like your own posts');
  }

  // ... rest of logic
}
```

---

### 4. **No Explicit Rate Limiting for Post Creation**
**File:** `apps/api/src/app.module.ts` (lines 30-46)

**Issue:**
Global throttler exists (60 req/sec, 300 per 10 sec, 1000 per min) but no specific rate limit for post creation. Users could create thousands of posts/day. Content-heavy users (creators) are disproportionately affected by global limits.

**Severity:** Medium (spam prevention needed)

**Current Global Limits:**
```typescript
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 60 },   // 60 req/sec
  { name: 'medium', ttl: 10000, limit: 300 }, // 300 per 10 sec
  { name: 'long', ttl: 60000, limit: 1000 },  // 1000 per min
]),
```

**Recommended Fix:**
```typescript
// In posts.controller.ts
@Post()
@Throttle('post-creation', { limit: 10, ttl: 3600 }) // 10 posts/hour
async createPost(...) { /* ... */ }

// Register custom key in app.module.ts
providers: [
  {
    provide: THROTTLER_LIMIT,
    useValue: { 'post-creation': 10 },
  },
]
```

---

### 5. **Comment Nesting Depth Limited in UI Only**
**File:** `apps/web/src/components/content/CommentSection.tsx` (lines 133-141)

**Issue:**
Frontend prevents replies beyond depth 3 (`if (depth < 3)`), but the API has no enforced limit. Clients could bypass this to create deeply nested threads, causing:
- Database query explosion (N+1 queries for nested fetches)
- Memory overhead (reply chains of 1000+ levels)

**Severity:** Low (frontend enforcement works, but should be API-enforced)

**Recommended Fix:**
```typescript
// In comments.service.ts createComment
if (parentId) {
  // Calculate depth
  const parentComment = await this.prisma.comment.findUnique({
    where: { id: parentId },
  });

  if (!parentComment) {
    throw new NotFoundException('Parent comment not found');
  }

  // Count ancestors to check depth
  const depth = await this.getCommentDepth(parentId);
  if (depth >= 3) {
    throw new BadRequestException('Reply nesting limited to 3 levels');
  }
}

private async getCommentDepth(commentId: string, depth = 0): Promise<number> {
  const comment = await this.prisma.comment.findUnique({
    where: { id: commentId },
    select: { parentId: true },
  });

  if (!comment?.parentId) return depth;
  return this.getCommentDepth(comment.parentId, depth + 1);
}
```

---

### 6. **Like Count Consistency Risk (Denormalized Counter)**
**Files:**
- `apps/api/src/verticals/feeds/content/services/likes.service.ts` (lines 45-54, 96-105)
- `apps/api/src/verticals/feeds/content/services/posts.service.ts` (lines 516)

**Issue:**
Like count is denormalized in `Post.likeCount` and updated via Prisma transactions. If a transaction fails mid-operation, counts can drift. API also returns both `_count.likes` (computed) and `likeCount` (denormalized) — these could diverge.

**Risk:**
- Soft failure silently corrupts counts (e.g., like created, count increment fails)
- Audit/correction requires manual queries

**Severity:** Low (transactions reduce risk, but not bulletproof)

**Recommended Fix:**
```typescript
// Consider removing denormalized field entirely
// Return computed count from Prisma _count relation
const post = await this.prisma.post.findUnique({
  include: { _count: { select: { likes: true } } },
});

return this.formatPost(post, userId);

// In formatPost, only use _count.likes
likeCount: post._count?.likes ?? 0,
```

---

### 7. **Trending Hashtags Calculated In-Memory from All Recent Posts**
**File:** `apps/api/src/verticals/feeds/content/services/posts.service.ts` (lines 472-497)

**Issue:**
Trending hashtags fetches ALL public posts from last 24 hours into memory, then tallies them:
```typescript
const recentPosts = await this.prisma.post.findMany({
  where: {
    deletedAt: null,
    visibility: 'PUBLIC',
    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  },
  select: { hashtags: true },
});

// Then counts in-memory
const hashtagCounts: Record<string, number> = {};
for (const post of recentPosts) {
  for (const tag of post.hashtags) {
    hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
  }
}
```

**Performance Risk:**
- O(n) database fetch + O(n*m) in-memory iteration
- If 100K posts with 5 hashtags each = 500K objects in memory
- Should use `_count` on database side

**Recommended Fix:**
```typescript
async getTrendingHashtags(limit: number = 10) {
  // Use raw SQL or aggregation pipeline
  const trending = await this.prisma.$queryRaw`
    SELECT
      tag,
      COUNT(*) as count
    FROM (
      SELECT DISTINCT postId, jsonb_array_elements(hashtags)::text as tag
      FROM post
      WHERE deletedAt IS NULL
        AND visibility = 'PUBLIC'
        AND createdAt >= NOW() - INTERVAL '24 hours'
    ) t
    GROUP BY tag
    ORDER BY count DESC
    LIMIT ${limit}
  `;

  return trending.map((row) => ({ tag: row.tag, count: row.count }));
}
```

---

## 🟢 Suggestions

### 1. **Implement Response DTO to Reduce Payload Size**
**Files:**
- `apps/api/src/verticals/feeds/content/services/posts.service.ts` (lines 502-533)

Currently, many fields returned in feed response are unnecessary (e.g., `updatedAt`, full author profile). Create lean response DTOs:

```typescript
export class PostFeedDto {
  id: string;
  content: string;
  type: PostType;
  mediaUrl?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}
```

**Benefit:** Reduce API response size by 30-40%, faster network transfers.

---

### 2. **Add Validation for Media File Sizes**
**File:** `apps/web/src/components/content/PostCreator.tsx` (lines 52-62, 64-72)

Frontend accepts any image/video but doesn't validate size. No backend file size validation visible:

```typescript
const handleMediaSelect = useCallback((file: File) => {
  // Add size validation
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  if (file.size > MAX_FILE_SIZE) {
    setError('File exceeds 500MB limit');
    return;
  }

  // ... existing logic
}, []);
```

---

### 3. **Use Named Database Indexes for Follow Graph**
**File:** `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts` (lines 145-183, 188-226)

Follow queries filter by `followerId` and `followingId` but likely lack indexes:

```typescript
// In Prisma schema (schema.prisma)
model Follow {
  id String @id @default(cuid())
  followerId String
  followingId String
  createdAt DateTime @default(now())

  @@unique([followerId, followingId])
  @@index([followerId])  // For getFollowing()
  @@index([followingId]) // For getFollowers()
}
```

---

### 4. **Add Idempotency Key Support for Post Creation**
**File:** `apps/api/src/verticals/feeds/content/controllers/posts.controller.ts` (lines 40-46)

Prevent duplicate posts on network retry:

```typescript
@Post()
async createPost(
  @Headers('Idempotency-Key') idempotencyKey: string,
  @GetUser('id') userId: string,
  @Body() createPostDto: CreatePostDto,
) {
  return this.postsService.createPost(userId, createPostDto, idempotencyKey);
}

// Service: Store idempotency key with post, return cached result if key seen
```

---

### 5. **Consider Event-Driven Notifications for Like/Comment**
**Current:** Direct event emit on like/comment (real-time)
**Suggestion:** Use event queue (BullMQ/RabbitMQ) for notification reliability

Benefits:
- Decouples notification system from content operations
- Retry logic for failed notifications
- Better observability

---

## Summary Table

| Category | Issue | Severity | Impact | Status |
|----------|-------|----------|--------|--------|
| **Authorization** | No block list filtering | 🔴 CRITICAL | Privacy breach | Needs fix |
| **Security** | No content sanitization | 🔴 CRITICAL | XSS risk | Needs fix |
| **Data Integrity** | Comment delete not cascading | 🔴 CRITICAL | Orphaned data | Needs fix |
| **UX** | No tombstone for deleted comments | 🔴 CRITICAL | Broken threads | Needs fix |
| **Performance** | Offset pagination at scale | 🟡 WARNING | O(n) queries | Backlog |
| **Performance** | No feed caching | 🟡 WARNING | Slow public feed | Backlog |
| **Business Logic** | Self-likes allowed | 🟡 WARNING | Metric inflation | Backlog |
| **Security** | No post creation rate limit | 🟡 WARNING | Spam risk | Backlog |
| **UX** | Depth limit UI-only | 🟡 WARNING | Thread explosion risk | Backlog |
| **Data** | Like count denormalization | 🟡 WARNING | Consistency drift | Monitor |
| **Performance** | Hashtag calc in-memory | 🟡 WARNING | Memory spike | Backlog |

---

## Recommendations Priority

**Immediate (This Sprint):**
1. Fix comment cascade delete
2. Add block list filtering to getFeed
3. Implement content sanitization
4. Add tombstone for deleted comments

**High Priority (Next Sprint):**
5. Add post creation rate limits
6. Implement API-level depth limits for comments
7. Switch to cursor-based pagination (or schedule backlog task)

**Medium Priority (Roadmap):**
8. Add Redis caching for public feeds
9. Optimize hashtag trending calculation
10. Remove denormalized like counts

**Low Priority (Polish):**
11. Create lean response DTOs
12. Add media file size validation
13. Add idempotency key support

---

## Testing Recommendations

### Unit Tests Needed
- [ ] Block list filtering in getFollowingFeed
- [ ] Content sanitization on create/update
- [ ] Comment cascade deletion
- [ ] Comment depth validation
- [ ] Self-like prevention

### Integration Tests
- [ ] Feed consistency after new post insertion
- [ ] Like count accuracy after concurrent operations
- [ ] Comment thread integrity after parent deletion

### Performance Tests
- [ ] Feed query time with 100K+ posts
- [ ] Hashtag calculation with 24h of posts
- [ ] Memory usage during trending calculation

---

## Code Quality Notes

**Positive:**
✅ Good use of transactions in likes service (atomicity)
✅ Proper cleanup in useFeed hook (isMountedRef, AbortController)
✅ Optimistic updates with rollback in PostCard component
✅ Event emission for async operations (notifications)
✅ Input validation with class-validator DTOs

**Areas for Improvement:**
⚠️ Missing error handling in notification creation (caught with .catch)
⚠️ No pagination cursor validation
⚠️ Trending hashtags not cached despite being expensive

---

## Conclusion

The Content domain is **functionally complete** but has **4 critical security/integrity gaps** that should be addressed before production scale. The architecture is sound with good async patterns, but needs refinement in authorization checks, data consistency, and feed performance optimization.

**Current Risk Level:** 🟡 **Medium** (blocking issues exist but mitigated by current scale)
**Post-Fix Risk Level:** 🟢 **Low** (production-ready after fixes)

