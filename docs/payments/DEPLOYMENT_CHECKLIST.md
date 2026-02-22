# Payment Infrastructure Deployment Checklist

## Pre-Deployment (1-2 weeks before)

### Stripe Setup
- [ ] Create Stripe account (if not exists)
- [ ] Get live API keys and secret keys
- [ ] Create Stripe webhooks for:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payout.paid`
  - `payout.failed`
  - `account.updated`
- [ ] Set webhook endpoint to: `https://api.embr.app/webhooks/stripe`
- [ ] Generate webhook signing secret
- [ ] Test webhook delivery
- [ ] Set up Stripe Connect for artist payouts
- [ ] Configure platform fee in Stripe settings
- [ ] Create test merchant accounts (optional)

### Environment Variables
- [ ] `STRIPE_SECRET_KEY` - Live secret key
- [ ] `STRIPE_PUBLISHABLE_KEY` - Live publishable key
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- [ ] `DATABASE_URL` - Production database
- [ ] `JWT_SECRET` - JWT signing key
- [ ] `EMAIL_PROVIDER_KEY` - For email notifications
- [ ] `SENTRY_DSN` - Error tracking
- [ ] `LOG_LEVEL` - Production log level

### Database
- [ ] Run all Prisma migrations
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Verify schema matches current version
- [ ] Backup production database
- [ ] Create indexes for:
  - transactions(userId)
  - transactions(createdAt)
  - gigBookings(status)
  - marketplaceOrders(userId)
- [ ] Test connection from API servers

### Monitoring & Logging
- [ ] Set up Sentry for error tracking
- [ ] Configure CloudWatch/Datadog logs
- [ ] Set up alerting:
  - Payment failures > 5% in 1 hour
  - Webhook errors > 10 in 1 hour
  - API latency > 5s
  - Database query time > 2s
- [ ] Create monitoring dashboard
- [ ] Set up PagerDuty or OpsGenie for on-call

### Email Templates
- [ ] Create email template: Payment Confirmation
- [ ] Create email template: Artist Earning Notification
- [ ] Create email template: Booking Confirmation
- [ ] Create email template: Dispute Notification
- [ ] Test email delivery
- [ ] Set up email verification domain

### Documentation
- [ ] Review all payment docs
- [ ] Create runbook for common issues
- [ ] Create incident response procedures
- [ ] Document rollback procedures
- [ ] Create customer support guide

---

## 48 Hours Before Deployment

### Testing
- [ ] Run all unit tests
  ```bash
  npm run test
  npm run test:cov
  ```
- [ ] Run all integration tests
  ```bash
  npm run test:e2e
  ```
- [ ] Test payment flows in staging:
  - [ ] Music licensing with Stripe test card
  - [ ] Gigs booking with payment & escrow
  - [ ] Marketplace with multiple sellers
- [ ] Test error scenarios:
  - [ ] Declined card
  - [ ] Expired card
  - [ ] Insufficient funds
  - [ ] Out of stock
  - [ ] Webhook timeout/retry
- [ ] Load testing:
  ```bash
  npm run load-test
  ```
- [ ] Security scan:
  ```bash
  npm run security-audit
  ```

### Code Review
- [ ] Have 2+ reviewers approve payment code
- [ ] Verify no secrets in code
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify rate limiting enabled
- [ ] Check CORS configuration
- [ ] Verify authentication guards on all endpoints

### Staging Environment
- [ ] Deploy to staging
- [ ] Verify all endpoints responding
- [ ] Test with staging Stripe keys
- [ ] Run payment flow tests
- [ ] Verify database migrations succeeded
- [ ] Check logs for errors
- [ ] Monitor staging for 24 hours

---

## Deployment Day

### Pre-Deployment (Morning)
- [ ] Notify team of deployment time
- [ ] Post maintenance window (if needed)
- [ ] Backup production database
- [ ] Document current state:
  ```bash
  # Capture current stats
  SELECT COUNT(*) as transaction_count FROM transactions;
  SELECT COUNT(*) as booking_count FROM gig_bookings;
  SELECT COUNT(*) as order_count FROM marketplace_orders;
  ```

### Deployment Steps
1. [ ] Merge to main branch
2. [ ] Tag release: `release/payments-2.0`
   ```bash
   git tag -a release/payments-2.0 -m "Payment infrastructure release"
   git push origin release/payments-2.0
   ```
3. [ ] Trigger CI/CD pipeline
4. [ ] Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```
5. [ ] Deploy API:
   ```bash
   npm run build
   npm run deploy:prod
   ```
6. [ ] Deploy frontend:
   ```bash
   npm run build
   npm run deploy:prod --prefix apps/web
   ```
7. [ ] Verify health checks:
   ```bash
   curl https://api.embr.app/health
   curl https://embr.app/health
   ```
8. [ ] Run smoke tests:
   - [ ] Create payment intent
   - [ ] Get order details
   - [ ] Query user bookings
   - [ ] Check merchant account

### Post-Deployment (First Hour)
- [ ] Monitor error rates (target: < 0.1%)
- [ ] Check payment success rate (target: > 95%)
- [ ] Verify webhook delivery (target: 100% delivered)
- [ ] Monitor API latency (target: < 200ms p95)
- [ ] Check database performance:
  ```bash
  SELECT AVG(duration) as avg_query_time FROM query_log;
  ```
- [ ] Monitor Stripe webhook queue
- [ ] Test live payments with real card (optional, with refund)

### First 24 Hours
- [ ] Monitor all metrics continuously
- [ ] Check for any reported issues
- [ ] Verify email notifications sending
- [ ] Test customer support scenarios
- [ ] Run daily reports:
  - Transactions processed
  - Revenue by vertical
  - Error rates
  - Webhook delivery status

---

## Rollback Plan (If Needed)

### Indicators for Rollback
- Payment success rate < 80%
- Webhook delivery failure rate > 10%
- Critical bugs in payment flow
- Database corruption detected
- API latency > 5s consistently

### Rollback Steps
1. [ ] Notify all team members
2. [ ] Stop accepting new payments
   ```bash
   UPDATE feature_flags SET enabled = false WHERE name = 'payments_v2';
   ```
3. [ ] Revert database migrations:
   ```bash
   npx prisma migrate resolve --rolled-back release/payments-2.0
   ```
4. [ ] Deploy previous version:
   ```bash
   git checkout release/payments-1.0
   npm run build
   npm run deploy:prod
   ```
5. [ ] Verify rollback successful
6. [ ] Notify customers
7. [ ] Post-mortem meeting
8. [ ] Fix issues before re-deploying

---

## Post-Deployment (1 Week)

### Monitoring
- [ ] Check payment metrics daily
- [ ] Review error logs for patterns
- [ ] Monitor escrow releases (gigs)
- [ ] Check marketplace order fulfillment
- [ ] Verify artist payouts processing

### Support
- [ ] Monitor support tickets
- [ ] Document any issues found
- [ ] Create FAQ based on questions
- [ ] Update runbooks if needed

### Optimization
- [ ] Analyze slow queries
- [ ] Optimize database indexes if needed
- [ ] Review cache hit rates
- [ ] Profile API endpoints
- [ ] Implement any performance fixes

### Documentation
- [ ] Update runbooks based on real incidents
- [ ] Document lessons learned
- [ ] Create incident post-mortems
- [ ] Update deployment procedures

---

## Success Metrics

### Target Metrics (After Deployment)
- Payment success rate: > 98%
- Webhook delivery: 100% (or nearly)
- API latency (p95): < 200ms
- Error rate: < 0.1%
- Database query time (p95): < 100ms
- Uptime: > 99.9%

### Health Check Dashboard
```
API Health:
├─ Payment endpoints: ✓ OK
├─ Database: ✓ OK
├─ Stripe connectivity: ✓ OK
├─ Email service: ✓ OK
└─ Cache: ✓ OK

Payment Metrics (Last 24h):
├─ Total transactions: 1,234
├─ Success rate: 98.5%
├─ Average latency: 145ms
├─ Webhooks delivered: 1,234
└─ Failed webhooks: 0

Revenue (Last 24h):
├─ Music licensing: $12,345
├─ Gigs bookings: $23,456
├─ Marketplace: $34,567
└─ Total: $70,368

Alerts:
├─ None active
└─ All clear ✓
```

---

## Knowledge Transfer

### Documentation to Review
- [ ] PAYMENT_FLOWS.md - All payment engineers
- [ ] ERROR_HANDLING.md - Support + backend team
- [ ] API_REFERENCE.md - Frontend + QA team
- [ ] DEPLOYMENT_CHECKLIST.md - DevOps + on-call

### Training Sessions
- [ ] Backend team: Payment architecture (30 min)
- [ ] Frontend team: Payment integration (20 min)
- [ ] Support team: Payment troubleshooting (30 min)
- [ ] On-call team: Incident response (30 min)

### On-Call Runbook
- [ ] Payment service down → restart service
- [ ] High error rate → check logs for pattern
- [ ] Webhook failures → check Stripe status
- [ ] Out of memory → check query performance
- [ ] Database slow → check for locks

---

## Sign-Off

- [ ] Project Manager: Deployment approved
- [ ] CTO: Technical review passed
- [ ] DevOps: Infrastructure ready
- [ ] Security: Security review passed
- [ ] QA: Testing complete
- [ ] Legal: Terms & compliance verified

**Deployment Date:** _______________
**Deployed By:** _______________
**Reviewed By:** _______________
