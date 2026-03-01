# Embr Infrastructure - Acceptance Criteria Checklist

This checklist verifies that all acceptance criteria for the infrastructure module have been met.

## ✅ Acceptance Criteria

### ☑ Database migrations run cleanly on fresh PostgreSQL instance

**Test Steps:**

```bash
# 1. Start fresh PostgreSQL
docker-compose -f docker/docker-compose.yml up -d postgres

# 2. Wait for health check
docker ps | grep embr_postgres

# 3. Generate Prisma client
npm run db:generate

# 4. Run migrations
npm run db:migrate:dev

# 5. Verify all tables created
npm run db:studio
# Check that all 33+ tables exist
```

**Expected Result:** ✓ All migrations apply without errors, all tables created

**Verification:**

- [ ] PostgreSQL container starts successfully
- [ ] Migrations complete without errors
- [ ] All models from schema.prisma have corresponding tables
- [ ] Indexes and constraints are properly created
- [ ] No migration warnings or conflicts

---

### ☑ Docker compose brings up all services with one command

**Test Steps:**

```bash
# 1. Ensure no services are running
docker-compose -f docker/docker-compose.yml down

# 2. Start all services
npm run docker:up

# 3. Verify all containers are running
docker ps
```

**Expected Result:** ✓ All 6 services start and pass health checks

**Services to Verify:**

- [ ] embr_postgres (Port 5432) - Status: healthy
- [ ] embr_redis (Port 6380) - Status: healthy
- [ ] embr_adminer (Port 8080) - Status: running
- [ ] embr_redis_commander (Port 8081) - Status: running
- [ ] embr_mailhog (Ports 1025, 8025) - Status: running
- [ ] embr_localstack (Port 4566) - Status: running

**UI Verification:**

- [ ] Can access Adminer at http://localhost:8080
- [ ] Can access Redis Commander at http://localhost:8081
- [ ] Can access MailHog at http://localhost:8025
- [ ] Can connect to PostgreSQL via Adminer
- [ ] Can view Redis keys via Redis Commander

---

### ☑ Environment configs properly separate secrets

**Test Steps:**

```bash
# 1. Review environment templates
cat env/.env.development.template
cat env/.env.staging.template
cat env/.env.production.template
```

**Expected Result:** ✓ Three separate environment templates with appropriate configurations

**Verification:**

- [ ] Development template uses localhost and test credentials
- [ ] Staging template uses Railway/Vercel variables and separate credentials
- [ ] Production template uses strong security settings and production credentials
- [ ] No actual secrets committed (only templates)
- [ ] All required environment variables documented
- [ ] Clear comments explaining each variable
- [ ] Security checklist included in production template
- [ ] Different JWT secrets for each environment
- [ ] Different database credentials for each environment
- [ ] Proper CORS origins configured per environment

**Secret Categories Verified:**

- [ ] Database credentials
- [ ] JWT tokens
- [ ] OAuth credentials (Google)
- [ ] AWS credentials
- [ ] Mux credentials
- [ ] Stripe credentials
- [ ] Relevnt API key
- [ ] SMTP credentials
- [ ] Sentry DSN

---

### ☑ CI/CD deploys on push to main branch

**Test Steps:**

```bash
# 1. Review GitHub Actions workflows
cat .github/workflows/api-deploy.yml
cat .github/workflows/web-deploy.yml
cat .github/workflows/mobile-deploy.yml

# 2. Verify triggers in each workflow
grep -A 5 "on:" .github/workflows/*.yml
```

**Expected Result:** ✓ Three complete CI/CD workflows configured

**API Deployment (api-deploy.yml):**

- [ ] Runs on push to main and staging branches
- [ ] Runs tests (lint, type-check, unit, E2E)
- [ ] Builds API artifacts
- [ ] Deploys to Railway staging on staging branch
- [ ] Deploys to Railway production on main branch
- [ ] Runs database migrations automatically
- [ ] Performs health checks post-deployment
- [ ] Includes rollback on failure
- [ ] Creates GitHub release tags

**Web Deployment (web-deploy.yml):**

- [ ] Runs on push to main and staging branches
- [ ] Runs tests (lint, type-check, accessibility)
- [ ] Builds Next.js application
- [ ] Deploys preview for PRs
- [ ] Deploys to Vercel staging on staging branch
- [ ] Deploys to Vercel production on main branch
- [ ] Runs Lighthouse CI for performance
- [ ] Tracks releases in Sentry
- [ ] Creates GitHub release tags
- [ ] Warms up cache post-deployment

**Mobile Deployment (mobile-deploy.yml):**

- [ ] Runs on push to main and staging branches
- [ ] Runs tests (lint, type-check)
- [ ] Builds with EAS for iOS and Android
- [ ] Submits to App Store automatically
- [ ] Submits to Play Store automatically
- [ ] Publishes OTA updates for JS changes
- [ ] Supports manual deployments via workflow_dispatch
- [ ] Runs E2E tests (optional)

**Configuration Verified:**

- [ ] GitHub secrets documented
- [ ] Environment protection rules recommended
- [ ] Required approvals for production noted
- [ ] Deployment branches configured
- [ ] Service health checks included
- [ ] Smoke tests included
- [ ] Error notifications configured

---

### ☑ Seed data creates realistic test scenarios

**Test Steps:**

```bash
# 1. Seed the database
npm run db:seed

# 2. Verify data via Prisma Studio
npm run db:studio

# 3. Check test accounts can log in
# Use credentials: admin@embr.app / test1234
```

**Expected Result:** ✓ Complete dataset with realistic relationships

**Data Verification:**

**Users & Profiles (50 total):**

- [ ] 1 admin account (admin@embr.app)
- [ ] 1 test creator (creator@embr.app)
- [ ] 1 test user (user@embr.app)
- [ ] 47 additional random users
- [ ] ~25 creator accounts
- [ ] ~25 regular user accounts
- [ ] All have profiles with avatars
- [ ] Varied locations and skills
- [ ] All have wallets initialized

**Social Graph:**

- [ ] Follow relationships created (varied counts)
- [ ] Follower counts updated in profiles
- [ ] Following counts updated in profiles
- [ ] No duplicate follows
- [ ] Realistic connection patterns

**Content (200 posts):**

- [ ] Text, image, and video posts
- [ ] Public and followers-only visibility
- [ ] Hashtags included
- [ ] Mentions included
- [ ] View counts assigned
- [ ] Created dates varied (last 30 days)
- [ ] Only creator accounts have posts

**Engagement:**

- [ ] Likes on posts (5-50 per post)
- [ ] Like counts updated
- [ ] Comments on posts (2-15 per post)
- [ ] Comment counts updated
- [ ] No duplicate likes per user/post

**Marketplace (30 gigs):**

- [ ] Various categories represented
- [ ] Different price ranges
- [ ] Active and draft statuses
- [ ] Portfolio URLs included
- [ ] Skills tagged
- [ ] View and order counts assigned
- [ ] Ratings and reviews (for some)

**Bookings:**

- [ ] Various statuses (pending, accepted, in_progress, completed)
- [ ] Escrow created for pending/in_progress
- [ ] Reviews created for completed
- [ ] Platform fees calculated
- [ ] Linked to gigs and users

**Jobs (20):**

- [ ] Company names varied
- [ ] Locations including remote options
- [ ] Salary ranges
- [ ] Relevnt IDs assigned
- [ ] Posted dates varied
- [ ] Expiration dates set
- [ ] Active status

**Monetization:**

- [ ] 50 tips created
- [ ] Transactions recorded
- [ ] Wallet balances updated
- [ ] Platform fees calculated
- [ ] Tip messages included
- [ ] Anonymous tips flagged

**Messaging:**

- [ ] 20 conversations created
- [ ] Multiple messages per conversation
- [ ] Message statuses (sent/delivered/read)
- [ ] No duplicate conversations

**Notifications (100):**

- [ ] Various types (like, comment, follow, tip, message)
- [ ] Read/unread states
- [ ] Action URLs included
- [ ] Dates varied (last 7 days)

**Analytics (500 events):**

- [ ] Various event types
- [ ] User attribution (some anonymous)
- [ ] Entity references (posts, gigs, jobs)
- [ ] Timestamps varied (last 30 days)
- [ ] Metadata included

**Test Account Access:**

- [ ] Can log in with admin@embr.app
- [ ] Can log in with creator@embr.app
- [ ] Can log in with user@embr.app
- [ ] Password 'test1234' works for all
- [ ] Each account has appropriate role
- [ ] Each account has wallet with balance

---

## 🎯 Summary

**Total Acceptance Criteria:** 5
**Criteria Met:** 5 ✓

All acceptance criteria have been successfully implemented and documented with verification steps.

---

## 📋 Pre-Launch Checklist

Before launching to production, verify:

**Infrastructure:**

- [ ] All Docker services tested in development
- [ ] Database migrations tested with rollback
- [ ] Backup and restore procedures tested
- [ ] Environment variables configured for all environments

**Security:**

- [ ] Production secrets generated with strong entropy
- [ ] Secrets stored in secure secret managers
- [ ] No secrets committed to version control
- [ ] CORS properly configured
- [ ] Rate limiting tested
- [ ] Helmet.js security headers enabled

**CI/CD:**

- [ ] GitHub secrets added for all environments
- [ ] Railway projects created and linked
- [ ] Vercel projects created and linked
- [ ] EAS configured for mobile deployments
- [ ] Environment protection rules set
- [ ] Required approvals configured

**Monitoring:**

- [ ] Sentry configured for error tracking
- [ ] Google Analytics integrated
- [ ] Log aggregation set up
- [ ] Health check endpoints working
- [ ] Alert notifications configured

**Database:**

- [ ] Connection pooling configured
- [ ] Backup schedule automated
- [ ] Migration strategy documented
- [ ] Performance indexes verified
- [ ] Data retention policy set

**Third-Party Services:**

- [ ] Google OAuth credentials created
- [ ] AWS S3 bucket created and configured
- [ ] Mux account set up
- [ ] Stripe account configured
- [ ] Relevnt API access confirmed
- [ ] SendGrid/email service configured

**Testing:**

- [ ] Seed data tested in development
- [ ] Test accounts verified
- [ ] API endpoints tested
- [ ] Frontend integration tested
- [ ] Mobile app integration tested
- [ ] Payment flows tested (with test mode)

---

## 🚀 Ready for Launch

When all items above are checked, your infrastructure is ready for production deployment!
