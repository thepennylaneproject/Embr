# Database Best Practices Guide for Embr

This document provides guidelines for writing efficient, secure, and maintainable database code using Prisma in the Embr platform.

## Table of Contents
1. [N+1 Query Prevention](#n1-query-prevention)
2. [Monetary Fields & Precision](#monetary-fields--precision)
3. [Transaction Safety](#transaction-safety)
4. [Performance Optimization](#performance-optimization)
5. [Security Best Practices](#security-best-practices)

---

## N+1 Query Prevention

### What is an N+1 Query?
An N+1 query occurs when you execute one query to fetch a list of records, then execute N additional queries to fetch related data for each record.

**Example - BAD (N+1 Problem):**
```typescript
// Gets all posts (1 query)
const posts = await this.prisma.post.findMany({ take: 100 });

// Then loops and fetches author for each (100 queries) - TERRIBLE!
for (const post of posts) {
  post.author = await this.prisma.user.findUnique({ where: { id: post.authorId } });
}
// Total: 101 queries 🔴
```

**Example - GOOD (Use include):**
```typescript
// Fetches posts + authors in 1-2 queries
const posts = await this.prisma.post.findMany({
  take: 100,
  include: {
    author: {
      include: { profile: true }
    }
  }
});
// Total: 1-2 queries ✅
```

### Critical Relations Prone to N+1

These models have many relations and should ALWAYS use explicit `include` or `select`:

#### 1. User Model (70+ relations)
**Relations:** profile, posts, comments, likes, tips, followers, following, wallet, etc.

**Safe Patterns:**
```typescript
// For user profiles
const user = await this.prisma.user.findUnique({
  where: { id: userId },
  include: {
    profile: true,
    wallet: true,
    _count: { select: { followers: true, following: true } }
  }
});

// For user lists with limited relations
const users = await this.prisma.user.findMany({
  where: { role: 'CREATOR' },
  select: {
    id: true,
    username: true,
    profile: { select: { displayName: true, avatarUrl: true } },
    _count: { select: { followers: true } }
  },
  take: 50
});
```

#### 2. Post Model
**Relations:** author, comments, likes, tips, tags

**Safe Patterns:**
```typescript
// For feed posts
const posts = await this.prisma.post.findMany({
  where: { visibility: 'PUBLIC' },
  orderBy: { createdAt: 'desc' },
  take: 20,
  include: {
    author: {
      select: {
        id: true,
        username: true,
        profile: { select: { displayName: true, avatarUrl: true } }
      }
    },
    _count: { select: { comments: true, likes: true, tips: true } }
  }
});

// For post detail page with all relations
const post = await this.prisma.post.findUnique({
  where: { id: postId },
  include: {
    author: { include: { profile: true } },
    comments: {
      include: {
        author: { select: { id: true, username: true, profile: { select: { avatarUrl: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    },
    _count: { select: { likes: true, tips: true } }
  }
});
```

#### 3. Gig Model
**Relations:** creator, applications, milestones, escrows, disputes, reviews

**Safe Patterns:**
```typescript
// For gig listings
const gigs = await this.prisma.gig.findMany({
  where: { status: 'OPEN' },
  select: {
    id: true,
    title: true,
    budgetMin: true,
    budgetMax: true,
    creator: {
      select: {
        id: true,
        username: true,
        profile: { select: { avatarUrl: true } }
      }
    },
    _count: { select: { applications: true } }
  },
  take: 50
});

// For gig detail page
const gig = await this.prisma.gig.findUnique({
  where: { id: gigId },
  include: {
    creator: { include: { profile: true } },
    applications: {
      include: {
        applicant: { select: { id: true, username: true, profile: { select: { avatarUrl: true } } } }
      }
    },
    milestones: true,
    escrows: true
  }
});
```

### Best Practices for Includes

1. **Always specify what you need with `select`:**
   ```typescript
   // BAD - fetches entire user object
   include: { author: true }

   // GOOD - fetches only needed fields
   include: {
     author: {
       select: { id: true, username: true, profile: { select: { avatarUrl: true } } }
     }
   }
   ```

2. **Use `_count` for relation counts instead of fetching all:**
   ```typescript
   // BAD - fetches all 10,000 likes
   include: { likes: true }

   // GOOD - just counts them
   _count: { select: { likes: true } }
   ```

3. **Implement pagination for large relations:**
   ```typescript
   // BAD - fetches all comments
   include: { comments: true }

   // GOOD - paginate comments
   include: {
     comments: {
       take: 20,
       orderBy: { createdAt: 'desc' }
     }
   }
   ```

4. **Use `select` to exclude unnecessary relations:**
   ```typescript
   // Instead of including many relations, explicitly select what's needed
   const user = await this.prisma.user.findUnique({
     where: { id: userId },
     select: {
       id: true,
       username: true,
       email: true,
       profile: { select: { displayName: true } }
       // Omit: wallet, posts, comments, tips, etc. if not needed
     }
   });
   ```

---

## Monetary Fields & Precision

### Rule: Always Use Cents (Integer) for Monetary Values

**Why?** Floating-point arithmetic has rounding errors that can cause money to go missing.

```typescript
// BAD - loses precision
0.1 + 0.2 = 0.30000000000000004  // Not 0.3!

// GOOD - use cents as integers
10 + 20 = 30  // Always correct
```

### Conversion Rules

- **Store:** Always as `Int` (represents cents)
- **Display:** Divide by 100 and format with 2 decimals
- **Calculate:** Work entirely in cents, never float

### Examples

```typescript
// Creating a tip ($5.00)
const tip = await this.prisma.tip.create({
  data: {
    senderId: userId,
    recipientId: recipientId,
    amount: 500,  // $5.00 in cents ✅
    fee: 25,      // 5% fee = $0.25
    netAmount: 475 // $4.75 net
  }
});

// Displaying to user
const displayAmount = (cents: number) => {
  return `$${(cents / 100).toFixed(2)}`;
};

console.log(displayAmount(tip.amount)); // $5.00

// Calculating with validation
const createTip = async (amountCents: number) => {
  // Validate minimum ($0.50)
  if (amountCents < 50) {
    throw new BadRequestException('Minimum tip is $0.50');
  }

  // Calculate fee (5%)
  const feeCents = Math.round(amountCents * 0.05);
  const netCents = amountCents - feeCents;

  return await this.prisma.tip.create({
    data: { senderId, recipientId, amount: amountCents, fee: feeCents, netAmount: netCents }
  });
};
```

### Gig Budget Examples

```typescript
// Creating a gig with budget $50-$200
const gig = await this.prisma.gig.create({
  data: {
    title: 'Logo Design',
    budgetMin: 5000,   // $50.00 in cents
    budgetMax: 20000,  // $200.00 in cents
    // ...
  }
});

// Validating application budget
const application = await this.prisma.application.create({
  data: {
    gigId,
    proposedBudget: 7500,  // $75.00 in cents
    // Must be within gig budget range
  }
});
```

---

## Transaction Safety

### Use Transactions for Multi-Step Operations

Financial operations MUST be atomic - all steps succeed or all rollback.

```typescript
// BAD - not atomic, money could disappear
const wallet = await this.prisma.wallet.update({
  where: { userId },
  data: { balance: { decrement: amountCents } }
});

await this.prisma.transaction.create({
  data: { userId, amount: amountCents, type: 'TIP_SENT' }
});
// If this fails, money was already deducted!

// GOOD - atomic transaction
const result = await this.prisma.$transaction(
  async (tx) => {
    // Verify balance first
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (wallet.balance < amountCents) {
      throw new BadRequestException('Insufficient balance');
    }

    // Deduct money
    const updated = await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: amountCents } }
    });

    // Record transaction
    await tx.transaction.create({
      data: { userId, amount: amountCents, type: 'TIP_SENT' }
    });

    return updated;
  },
  { isolationLevel: 'Serializable' } // Prevent race conditions
);
```

### Isolation Levels

- **Serializable** - Use for critical financial operations (highest safety)
- **RepeatableRead** - Use for operations that need consistent reads
- **ReadCommitted** - Default, good for non-critical operations

```typescript
// High-value transaction
await this.prisma.$transaction(
  async (tx) => { /* ... */ },
  { isolationLevel: 'Serializable' }  // $1000+ transfers
);

// Normal operation
await this.prisma.$transaction(
  async (tx) => { /* ... */ }
  // Default isolation is fine for non-critical ops
);
```

---

## Performance Optimization

### Indexes on Common Query Patterns

The database includes composite indexes for:

- **Posts:** `(authorId, createdAt)` - for user feeds
- **Transactions:** `(userId, type, createdAt)` - for filtered history
- **Tips:** `(senderId, createdAt)`, `(recipientId, createdAt)` - for tip lists
- **Messages:** `(conversationId, createdAt)` - for conversation pagination

### Pagination Pattern

Always paginate large result sets:

```typescript
// BAD - fetches all 10M posts
const posts = await this.prisma.post.findMany({
  where: { visibility: 'PUBLIC' }
});

// GOOD - fetch 20 at a time
const getPosts = async (page: number = 1, pageSize: number = 20) => {
  return await this.prisma.post.findMany({
    where: { visibility: 'PUBLIC' },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { author: { select: { id: true, username: true } } }
  });
};
```

### Cursor-Based Pagination (More Efficient)

```typescript
const getPostsFeed = async (cursor?: string, limit: number = 20) => {
  return await this.prisma.post.findMany({
    where: { visibility: 'PUBLIC' },
    orderBy: { id: 'desc' },
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit,
    include: {
      author: { select: { id: true, username: true, profile: { select: { avatarUrl: true } } } }
    }
  });
};
```

---

## Security Best Practices

### 1. Never Trust User Input
```typescript
// BAD - potential SQL injection (if using raw SQL)
const posts = await this.prisma.$queryRaw(`
  SELECT * FROM "Post" WHERE authorId = ${userId}
`);

// GOOD - Prisma parameterizes automatically
const posts = await this.prisma.post.findMany({
  where: { authorId: userId }
});
```

### 2. Check Permissions at Database Level

```typescript
// Always verify ownership before updating
const post = await this.prisma.post.findUnique({
  where: { id: postId }
});

if (post.authorId !== userId) {
  throw new ForbiddenException('Not post owner');
}

await this.prisma.post.update({
  where: { id: postId },
  data: { content: newContent }
});
```

### 3. Use Soft Deletes
```typescript
// Don't permanently delete user data - soft delete
await this.prisma.user.update({
  where: { id: userId },
  data: { deletedAt: new Date() }
});

// Exclude deleted users from queries
const activeUsers = await this.prisma.user.findMany({
  where: { deletedAt: null }
});
```

### 4. Check Constraints Prevent Invalid States
```typescript
// Database enforces:
// - tip_amount_positive: amount > 0
// - wallet_balance_non_negative: balance >= 0
// - gig_budget_min_lte_max: budgetMin <= budgetMax

// These constraints prevent invalid data at the DB level
```

### 5. Idempotency for External Payments
```typescript
// Use Stripe's idempotency key
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const charge = await stripe.charges.create(
  { amount, currency: 'usd' },
  { idempotencyKey: `${userId}-${tipId}` }  // Prevents duplicate charges
);
```

---

## Monitoring & Debugging

### Enable Query Logging in Development

```typescript
// prisma.service.ts
export class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'warn' }
      ]
    });

    this.$on('query', (e) => {
      console.log('Query:', e.query);
      console.log('Duration:', e.duration + 'ms');
    });
  }
}
```

### Common Performance Issues

1. **Missing `include` clauses** → N+1 queries
2. **Fetching all relations with `true`** → Unnecessary data transfer
3. **No pagination** → Slow list endpoints
4. **Float arithmetic** → Rounding errors in money
5. **Non-atomic financial ops** → Data inconsistency

---

## Quick Reference Checklist

- [ ] All monetary amounts stored as `Int` (cents)
- [ ] Financial operations wrapped in `$transaction(..., { isolationLevel: 'Serializable' })`
- [ ] User/Post/Gig queries use explicit `include` or `select`
- [ ] Large result sets paginated with `take` and `skip`
- [ ] Critical operations have unique database constraints
- [ ] Foreign keys use appropriate cascade rules
- [ ] Soft deletes used instead of hard deletes for users/content
- [ ] No raw SQL (or uses parameterized queries)
- [ ] Check constraints enforced at database level
- [ ] Monitoring logs show no N+1 patterns

---

## Resources

- [Prisma Relations Documentation](https://www.prisma.io/docs/concepts/relations)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/transactions)
- [PostgreSQL Check Constraints](https://www.postgresql.org/docs/current/sql-createtable.html)
