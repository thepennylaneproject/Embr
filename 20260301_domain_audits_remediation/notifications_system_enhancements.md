# Notifications System - Optional Enhancements Guide

## 📋 Overview

The notification system has been enhanced with several optional features for production deployments:

1. **Notification Preferences** - User control over notification types
2. **Email Notifications** - Critical event alerts via email
3. **Analytics & Monitoring** - Delivery and engagement tracking
4. **Redis Adapter** - Multi-instance WebSocket synchronization
5. **Prisma Migration** - Database schema changes

---

## 🎯 Notification Preferences

### Files
- `notifications.preferences.ts` - Type definitions and constants

### Implementation

Update the `Profile` model in `schema.prisma`:

```prisma
model Profile {
  // ... existing fields ...

  notificationPreferences Json? // Stores NotificationSettings

  @@index([userId])
}
```

### Usage

```typescript
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from './notifications.preferences';

// Create default settings
const settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS;

// User can customize
settings.commentLiked = false;  // Don't notify on comment likes
settings.postLiked = false;     // Don't notify on post likes
settings.newComment = true;     // Keep comment notifications

// Persist to database
await prisma.profile.update({
  where: { userId },
  data: { notificationPreferences: settings }
});
```

### Features

- 14 granular notification type toggles
- Preference types: `all`, `important`, `none`
- Type-safe settings with TypeScript

---

## 📧 Email Notifications

### Files
- `notifications.email.ts` - Email delivery service

### Features

- **High-priority only**: Only critical events trigger emails by default
- **User preferences**: Extendable to respect user settings
- **Fallback reliability**: Email failures don't block in-app notifications
- **Action links**: Include direct links to relevant content

### Critical Notification Types

```typescript
// Application accepted
await emailService.sendGigApplicationAccepted(
  applicantId,
  'Logo Design Project',
  gigId
);

// Moderation action
await emailService.sendModerationAction(
  userId,
  'CONTENT_REMOVAL',
  'Violated community guidelines'
);

// High-value tip
await emailService.sendHighValueTipReceived(
  recipientId,
  'John Doe',
  5000 // $50.00
);
```

### Configuration

Set environment variables:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password
APP_URL=https://embr.app
```

---

## 📊 Analytics & Monitoring

### Files
- `notifications.analytics.ts` - Delivery metrics and insights

### Metrics Tracked

```typescript
// Delivery statistics (last 7 days)
const stats = await analyticsService.getDeliveryStats(7);

// Returns:
{
  totalCreated: 1250,
  totalRead: 890,
  overallReadRate: 71.2,
  averageReadTime: 3600000, // ms
  byType: [
    { type: 'NEW_COMMENT', created: 320, read: 290, readRate: 90.6 },
    { type: 'COMMENT_LIKED', created: 500, read: 210, readRate: 42.0 },
    ...
  ],
  topUnreadTypes: [
    { type: 'POST_LIKED', count: 180 },
    { type: 'COMMENT_LIKED', count: 110 },
  ]
}
```

### Health Report

```typescript
const health = await analyticsService.getHealthReport();

// Alert on issues:
if (health.alerting.lowEngagement) {
  console.warn('Low notification engagement - investigate');
}

if (health.alerting.manyUnreadsUsers) {
  console.warn(`${health.highUnreadUsers.length} users with >50 unread`);
}
```

### User Engagement

```typescript
const userStats = await analyticsService.getUserNotificationStats(userId);

// Returns:
{
  userId: 'user-123',
  totalNotifications: 145,
  unreadNotifications: 12,
  readNotifications: 133,
  readRate: 91.7,
  engagementLevel: 'high' // or 'medium', 'low'
}
```

---

## 🔄 Redis Adapter (Multi-Instance)

### Files
- `redis-io.adapter.ts` - Socket.IO Redis synchronization

### Setup

1. Install dependencies:
```bash
npm install @socket.io/redis-adapter redis
```

2. Update main.ts to initialize adapter:
```typescript
import { RedisIoAdapter } from './core/notifications/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisAdapter = new RedisIoAdapter(app);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  await app.listen(3000);
}
```

3. Set environment variable:
```bash
REDIS_URL=redis://localhost:6379
# or
REDIS_URL=redis://:password@redis.example.com:6379
```

### Benefits

- ✅ Real-time sync across 10+ server instances
- ✅ User connected to any server gets all broadcasts
- ✅ Automatic message routing to correct instances
- ✅ Fallback to in-memory if Redis unavailable

### How It Works

```
┌─────────────────────────────────────────────┐
│  User connects to Server A                  │
│  -> Joins room: user:user-123               │
└─────────────────────────────────────────────┘

         ┌──────────────────────┐
         │  Redis Pub/Sub       │
         │  (Shared across all) │
         └──────────────────────┘

Notification created on Server B:
  -> Emitted to all servers via Redis
  -> Server A receives event
  -> Server A broadcasts to user:user-123
  -> User gets real-time update
```

---

## 🗄️ Prisma Migration

### Current Schema Change

Added field to User model:
```prisma
model User {
  // ... existing fields ...
  unreadNotificationCount Int @default(0) // Denormalized for performance
}
```

### Running Migration

```bash
cd apps/api

# Generate and apply migration
npx prisma migrate dev --name add_unread_notification_count

# Or create without applying
npx prisma migrate dev --create-only --name add_unread_notification_count
```

### What It Does

- ✅ Adds column to users table
- ✅ Sets default value to 0
- ✅ Creates index for fast lookups
- ✅ Enables O(1) unread count queries

---

## 🚀 Implementation Checklist

### Phase 1: Core (Already Complete)
- [x] Route ordering fix
- [x] Event listeners for comments/applications
- [x] WebSocket gateway
- [x] Retention policy
- [x] Idempotent operations
- [x] Frontend pagination
- [x] Unread count denormalization

### Phase 2: Enhancements (New)
- [ ] Database migration for unreadNotificationCount
- [ ] Notification preferences in Profile
- [ ] Email service integration
- [ ] Analytics endpoints (admin)
- [ ] Redis adapter configuration
- [ ] Monitoring dashboard

### Phase 3: Polish (Optional)
- [ ] Notification digest emails (daily/weekly)
- [ ] Do Not Disturb (quiet hours)
- [ ] Push notifications (FCM/APNs)
- [ ] Notification templates
- [ ] A/B testing for types

---

## 📈 Monitoring & Alerts

### Key Metrics to Watch

1. **Read Rate** - What % of notifications are read?
   - Target: >70%
   - Alert: <50%

2. **High Unread Count** - Users with 50+ unread
   - Could indicate onboarding issues
   - Check notification relevance

3. **Email Delivery** - Critical events reaching users
   - Track bounce rates
   - Monitor inbox placement

4. **WebSocket Connections** - Real-time engagement
   - Active connections per server
   - Memory usage

### Recommended Alerts

```typescript
// Alert on low engagement
if (stats.overallReadRate < 30) {
  sendAlert({
    severity: 'warning',
    message: 'Low notification engagement - check type relevance'
  });
}

// Alert on high unread users
const highUnreadCount = await analyticsService.findHighUnreadUsers(100);
if (highUnreadCount.length > 20) {
  sendAlert({
    severity: 'info',
    message: `${highUnreadCount.length} users with 100+ unread notifications`
  });
}
```

---

## 🔐 Security Considerations

- ✅ JWT authentication on WebSocket connections
- ✅ User ID from auth token, not request
- ✅ Room-based isolation (user:{userId})
- ✅ Email validation before sending
- ✅ Rate limiting on API endpoints

---

## 📚 API Reference

### REST Endpoints

```
GET    /notifications
GET    /notifications/count
GET    /notifications/:id
PATCH  /notifications/:id/read
PATCH  /notifications/read-all
DELETE /notifications/:id
DELETE /notifications/read

# New endpoints (admin)
GET    /notifications/analytics/health
GET    /notifications/preferences/me
```

### WebSocket Events

```
Client → Server:
  notifications:subscribe
  notifications:mark-read
  notifications:mark-all-read
  notifications:delete

Server → Client:
  notifications:initial
  notifications:new
  notifications:unread-count
```

---

## 🎓 Next Steps

1. **Implement Preferences**
   - Add `notificationPreferences` JSON field to Profile
   - Create settings UI in user dashboard
   - Check preferences before creating notifications

2. **Set Up Email Service**
   - Configure SMTP credentials
   - Test critical notification flows
   - Monitor delivery rates

3. **Deploy Redis**
   - Set up Redis instance (or use cloud service)
   - Update adapter configuration
   - Test multi-instance scenarios

4. **Add Monitoring**
   - Create analytics dashboard
   - Set up alerts for thresholds
   - Monitor email delivery

---

**Questions?** Refer to the inline code documentation in each service file.
