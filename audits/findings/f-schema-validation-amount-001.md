# Finding: f-schema-validation-amount-001

> **Status:** open | **Severity:** Major | **Priority:** P1 | **Type:** bug | **Confidence:** Evidence

## Title

Monetary amount fields lack NOT NULL or CHECK constraints in schema

## Description

The Wallet, Transaction, Tip, and Payout tables have monetary amount fields that lack database-level constraints. Fields like `balance`, `amount`, etc. are not marked as NOT NULL and have no CHECK constraint to prevent negative values. An application bug or malicious raw SQL could insert negative amounts, causing accounting errors and money duplication.

## Proof Hooks

### [code_ref] Wallet balance field without constraints
| Field | Value |
|-------|-------|
| File | `apps/api/prisma/schema.prisma` |
| Symbol | `Wallet.balance` |
| Issue | Should be NOT NULL with CHECK (balance >= 0) |

### [code_ref] Transaction amount field without constraints
| Field | Value |
|-------|-------|
| File | `apps/api/prisma/schema.prisma` |
| Symbol | `Transaction.amount` |
| Issue | Should be NOT NULL with CHECK (amount > 0) |

### [code_ref] Tip amount field without constraints
| Field | Value |
|-------|-------|
| File | `apps/api/prisma/schema.prisma` |
| Symbol | `Tip.amount` |
| Issue | Should be NOT NULL with CHECK (amount >= 0) |

### [code_ref] Payout amount field without constraints
| Field | Value |
|-------|-------|
| File | `apps/api/prisma/schema.prisma` |
| Symbol | `Payout.amount` |
| Issue | Should be NOT NULL with CHECK (amount >= 0) |

## Reproduction Steps

1. Write a raw SQL statement (or exploit application bug):
   ```sql
   UPDATE "Wallet" SET balance = -999.99 WHERE "userId" = '123';
   ```
2. Database accepts the update (no CHECK constraint)
3. User's wallet balance is now negative (impossible in real world)
4. Application logic breaks: user can withdraw more than they have

**Scenario 2 (NULL values):**
1. Application bug: amount field not populated in INSERT
2. Query: `INSERT INTO "Transaction" (userId, conversationId) VALUES (...)`
3. Database accepts (no NOT NULL)
4. amount is NULL, application crashes on `amount > 0` comparisons

## Impact

**Accounting Errors:**
- Negative balances (impossible state)
- NULL amounts (unknown money transfers)
- Total wallet balance doesn't match sum of transactions
- Reconciliation failures between payment system and database

**Fraud Prevention Gap:**
- Application code prevents negative amounts
- But if app is bypassed or buggy, database accepts invalid data
- Defense-in-depth requires database-level constraints

**Regulatory Impact:**
- Financial records must be accurate (GAAP, financial regulations)
- NULL amounts violate audit trail requirements
- Negative balances indicate data corruption

**User Impact:**
- User with negative balance can withdraw more than they own
- Tips sent with NULL amounts don't appear in history
- Wallet reconciliation queries return wrong totals
- Creators owed money can't verify accurate payouts

## Suggested Fix

**Approach:** Add NOT NULL and CHECK constraints via database migration

**Migration Example:**
```sql
-- Add NOT NULL constraint
ALTER TABLE "Wallet" 
  ALTER COLUMN "balance" SET NOT NULL;

-- Add CHECK constraint
ALTER TABLE "Wallet" 
  ADD CONSTRAINT wallet_balance_check 
  CHECK (balance >= 0);

-- Repeat for other tables
ALTER TABLE "Transaction" 
  ALTER COLUMN "amount" SET NOT NULL;

ALTER TABLE "Transaction" 
  ADD CONSTRAINT transaction_amount_check 
  CHECK (amount > 0);

ALTER TABLE "Tip" 
  ALTER COLUMN "amount" SET NOT NULL;

ALTER TABLE "Tip" 
  ADD CONSTRAINT tip_amount_check 
  CHECK (amount >= 0);

ALTER TABLE "Payout" 
  ALTER COLUMN "amount" SET NOT NULL;

ALTER TABLE "Payout" 
  ADD CONSTRAINT payout_amount_check 
  CHECK (amount >= 0);
```

**Affected files:**
- `apps/api/prisma/schema.prisma` (schema definition)
- Create new migration: `add_monetary_constraints`

**Effort:** 1 day (data validation + migration + testing)

**Risk:** Medium — Must backfill existing NULL values before adding NOT NULL

## Tests Needed

- [ ] INSERT with NULL amount is rejected
- [ ] INSERT with negative amount is rejected
- [ ] INSERT with zero amount depends on business logic (test both)
- [ ] INSERT with positive amount succeeds
- [ ] UPDATE to negative value is rejected
- [ ] UPDATE to NULL is rejected
- [ ] Existing NULL values in database handled (backfill or reject)
- [ ] Existing negative values identified and corrected
- [ ] Query performance unchanged (check EXPLAIN plans)
- [ ] Constraint names match Prisma schema documentation

## Related Findings

| ID | Relationship |
|----|-------------|
| f-schema-nullable-walletid-001 | Related: Foreign key nullable patterns affect data integrity |
| sec-001 | Related: Direct database access without constraints is security risk |

## Timeline

| Date | Actor | Event | Notes |
|------|-------|-------|-------|
| 2026-03-10 | audit-agent | Finding identified | Schema auditor found missing constraints |
| (pending) | developer | Create migration | Add CHECK and NOT NULL constraints |
| (pending) | QA | Data validation | Verify existing data is valid |
| (pending) | deployment | Apply migration | Run on staging first |

## Artifacts

## Enhancement Notes

**Constraint Design Considerations:**

1. **Precision:** Use DECIMAL/NUMERIC not FLOAT for money
   - FLOAT can have rounding errors
   - DECIMAL is exact (e.g., DECIMAL(18, 2) for cents)

2. **Negative Amount Rules:**
   - Wallet balance: >= 0 (can be zero)
   - Transaction amount: > 0 (always positive money flow)
   - Tip amount: >= 0 (zero-tip allowed?)
   - Payout amount: > 0 (always positive payout)

3. **Backfill Strategy (if existing NULL/negative values):**
   ```sql
   -- Find problematic records
   SELECT * FROM "Wallet" WHERE balance < 0 OR balance IS NULL;
   SELECT * FROM "Transaction" WHERE amount < 0 OR amount IS NULL;
   
   -- Backfill strategy:
   -- Option A: Set invalid values to 0 (data loss potential)
   -- Option B: Mark as requires_review and create incident
   -- Option C: Delete invalid records (if possible)
   ```

4. **Application Layer Still Needed:**
   - Database constraints prevent impossible states
   - Application validation provides better UX (fail fast)
   - Both are required (defense-in-depth)

**Prisma Schema Update Example:**

```prisma
model Wallet {
  id        String   @id @default(cuid())
  userId    String   @unique
  balance   Decimal  @default(0) // Already DECIMAL is good
  
  // In migration:
  // - Add @@map("wallets")
  // - Add NOT NULL if missing
  // - Add CHECK constraint in raw SQL migration
}
```

## Decision Log (for type: question)

Not applicable (bug fix, not a decision point)

