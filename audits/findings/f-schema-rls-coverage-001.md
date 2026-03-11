# Finding: f-schema-rls-coverage-001

> **Status:** open | **Severity:** Blocker | **Priority:** P0 | **Type:** question | **Confidence:** Inference

## Title

Database uses PostgreSQL but no RLS (Row-Level Security) policies defined

## Description

The Embr platform uses PostgreSQL 16 as its primary database, but no Row-Level Security (RLS) policies are currently defined. All data access control relies on application-layer authorization checks. This creates a significant security risk: if application middleware is bypassed or contains a bug, sensitive user data (profiles, wallets, messages, transactions) could be exposed.

RLS enforces access control at the database level, providing defense-in-depth protection. For a multi-tenant creator platform, RLS is considered industry best practice.

## Proof Hooks

### [code_ref] PostgreSQL configuration without RLS
| Field | Value |
|-------|-------|
| File | `apps/api/prisma/schema.prisma` |
| Summary | Schema defines all tables but no RLS policies are configured |

### [config_key] Database connection via Prisma
| Field | Value |
|-------|-------|
| Config Key | `DATABASE_URL` |
| Database | PostgreSQL 16 |
| Evidence | Uses standard PostgreSQL connection; RLS would be configured in database migrations |

### [inference] Multi-tenant data isolation needed
| Field | Value |
|-------|-------|
| Summary | User data is multi-tenant (creators, followers, wallets, messages) requiring isolation |
| Evidence | Multiple user roles (ADMIN, CREATOR, USER) with different data visibility rules |

## Reproduction Steps

1. Connect to the production database: `psql $DATABASE_URL`
2. Check for RLS policies: `SELECT * FROM pg_policies;`
3. Result: Empty result set (no RLS policies defined)
4. Check if RLS is enabled on tables: `SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE rowsecurity = true;`
5. Result: No tables have RLS enabled

## Impact

**Security Impact:**
- Data access control relies entirely on application code
- Application bugs (IDOR, authorization bypass) directly expose user data
- No database-layer enforcement of multi-tenant isolation
- Regulatory/compliance risk (HIPAA, GDPR, SOC 2 require defense-in-depth)

**Data at Risk:**
- User profiles (PII: email, location, age)
- Wallet balances and transaction history
- Private messages and conversations
- Gig applications and contract details
- Payment information

**Attack Scenarios:**
1. SQL injection bypasses application checks → all data exposed
2. Logic bug in authorization service → users access others' data
3. Privilege escalation → admin access to all records
4. Insider threat → database access without app layer checks

## Suggested Fix

**Approach:** Design and implement database-level RLS policies for multi-tenant data isolation

**Affected files:** 
- `apps/api/prisma/schema.prisma` (schema documentation)
- New migrations for RLS policy creation
- Updated authorization service to integrate with RLS context

**Effort:** 5-7 days (design + implementation + testing)

**Risk:** Medium — Must ensure RLS policies match application authorization logic; incorrect policies could lock out legitimate access

## Tests Needed

- [ ] RLS policies block unauthorized access (unit tests)
- [ ] Admin can access any user's data via elevated context
- [ ] Users can only access their own wallet data
- [ ] Followers see only public profile data (not private settings)
- [ ] Direct database queries bypass application code but still respect RLS
- [ ] Message access: only conversation participants can read
- [ ] Gig access: only creator and applicants can view details
- [ ] Performance: RLS policies don't degrade query performance (check EXPLAIN plans)
- [ ] Migration rollback procedure tested
- [ ] All queries verified to work with RLS enabled

## Related Findings

| ID | Relationship |
|----|-------------|
| sec-001 | Related: Secrets management affects database access security |
| sec-005 | Related: IDOR issues partially mitigated by RLS at database level |
| f-schema-nullable-walletid-001 | Related: Data integrity issues would be caught by RLS constraints |

## Timeline

| Date | Actor | Event | Notes |
|------|-------|-------|-------|
| 2026-03-10 | audit-agent | Finding identified | Schema auditor identified missing RLS policies |
| 2026-03-10 | agent | Documented | Created finding document with industry recommendations |
| (pending) | decision-maker | Decision | Should RLS be implemented? |
| (pending) | developer | Design | RLS policy matrix and role-based rules |
| (pending) | developer | Implementation | Create migrations and enforce policies |

## Artifacts

## Enhancement Notes

**RLS Policy Design Pattern:**

For each multi-tenant table, define policies like:
```sql
-- Example: Users can only see their own profile unless they're admin
CREATE POLICY user_isolation ON users
  FOR SELECT
  USING (
    current_user_id() = id OR
    has_role('admin')
  );

-- Example: Users can only read messages they sent or received
CREATE POLICY message_isolation ON messages
  FOR SELECT
  USING (
    sender_id = current_user_id() OR
    recipient_id = current_user_id() OR
    has_role('admin')
  );
```

**Implementation Path:**

1. **Phase 1:** Design RLS policy matrix (table → role → allowed columns/rows)
2. **Phase 2:** Create helper functions in PostgreSQL for role checking
3. **Phase 3:** Create migrations for each table's policies
4. **Phase 4:** Update application code to set RLS context on connection
5. **Phase 5:** Comprehensive testing (unit + integration + performance)
6. **Phase 6:** Gradual rollout (dev → staging → production)

**Performance Considerations:**
- RLS adds minimal overhead if policies are simple
- Complex policies with subqueries may impact performance
- Index policies on frequently filtered columns (user_id, created_by)
- Benchmark before/after with realistic data volumes

## Decision Log (for type: question)

This is a DECISION-REQUIRED finding.

### Decision Pending

- **Question:** Should Row-Level Security (RLS) be implemented at the database layer?
- **Context:** Multi-tenant creator platform with sensitive financial and personal data
- **Options:**
  - **Option A:** Implement full RLS policies (Recommended)
    - Cost: 5-7 days development
    - Benefit: Database-layer security isolation, compliance, defense-in-depth
    - Risk: Medium (must align with app logic)
    - Compliance: Required for HIPAA, GDPR, SOC 2
  - **Option B:** Rely on application-layer authorization only
    - Cost: Already implemented
    - Benefit: Faster MVP, simpler deployment
    - Risk: High (any app bug exposes data, insider threat)
    - Compliance: Insufficient for regulated industries

### Decision Required From

- **Role:** Product Lead + Security Lead
- **Timeline:** Before production launch
- **Impact:** Affects deployment timeline and security posture

---

## RLS Architecture (Industry Best Practice)

### Table-by-Table Policy Matrix

| Table | Read | Write | Delete |
|-------|------|-------|--------|
| **users** | Self or Admin | Self only | Never |
| **profiles** | Public data visible to all; Private only to self or Admin | Self only | Admin only |
| **wallets** | Self only | Self only | Never |
| **transactions** | Payer/Payee or Admin | System generated | Never |
| **messages** | Participants or Admin | Sender (immutable) | Sender (soft-delete) |
| **gigs** | Creator + applicants | Creator | Creator |
| **follows** | Participant | Self or other (follow/unfollow) | Self |

### Example Implementation

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Admin can see all users
CREATE POLICY admin_all_users ON users
  FOR SELECT
  USING (current_user_role() = 'ADMIN');

-- Users can see their own record
CREATE POLICY user_own_record ON users
  FOR SELECT
  USING (id = current_user_id());

-- Users can see public profiles
CREATE POLICY public_profiles ON users
  FOR SELECT
  USING (is_public = true);

-- Users can only update their own record
CREATE POLICY user_update_own ON users
  FOR UPDATE
  USING (id = current_user_id());
```

### Application Integration

In NestJS auth module:
```typescript
// Set RLS context after user authentication
const client = await prisma.$queryRaw(
  Prisma.sql`SELECT set_config('app.current_user_id', ${userId}, true)`
);

// PostgreSQL knows authenticated user ID for all subsequent queries
```

---

