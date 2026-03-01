# TypeScript Types Domain Audit Report
**Date:** 2026-03-01
**Scope:** Embr Monorepo - Shared Type Definitions
**Files Audited:**
- `packages/types/src/index.ts`
- `packages/types/src/gig.types.ts`
- `apps/api/src/shared/types/gig.types.ts`
- `apps/web/src/shared/types/gig.types.ts`
- `packages/creator-tools/src/types.ts`

---

## 🔴 Critical Issues

### 1. **Type Definition Duplication & Drift**
**File:** `packages/types/src/gig.types.ts` vs `apps/api/src/shared/types/gig.types.ts` vs `apps/web/src/shared/types/gig.types.ts`

**Issue:** Gig types are defined in THREE separate locations instead of a single source of truth:
- `packages/types/src/gig.types.ts` (appears to be intended source of truth)
- `apps/api/src/shared/types/gig.types.ts` (identical duplicate)
- `apps/web/src/shared/types/gig.types.ts` (identical duplicate)

**Current Import Pattern:**
- API: imports from `../../../shared/types/gig.types` (local, not shared package)
- Web: imports from `@shared/types/gig.types` (local, not shared package)
- Neither app imports from `packages/types`, defeating the purpose of having a shared package

**Risk:** If any type changes, developers must update it in three places, causing out-of-sync drift and bugs. Each app has their own "source of truth."

**Recommendation:**
1. Delete `apps/api/src/shared/types/gig.types.ts`
2. Delete `apps/web/src/shared/types/gig.types.ts`
3. Update imports to use `packages/types`:
   - API: `import { Gig, ... } from '@embr/types';` (via monorepo package)
   - Web: Add `@embr/types` path alias in tsconfig, then `import { Gig, ... } from '@embr/types';`
4. Verify `packages/types/src/index.ts` exports all gig types

---

### 2. **Inconsistent Enum Pattern Usage**
**Files:**
- `packages/types/src/gig.types.ts` (lines 10-72)
- `apps/api/src/shared/types/gig.types.ts` (lines 10-79)
- `apps/web/src/shared/types/gig.types.ts` (lines 10-79)

**Issue:** Two different patterns are used for defining enums:

**packages/types (Traditional Enum):**
```typescript
export enum GigStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  // ...
}
```

**apps/api & apps/web (Const + Type Pattern):**
```typescript
export const GigStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  // ...
} as const;
export type GigStatus = typeof GigStatus[keyof typeof GigStatus];
```

**Additional Problem:** Even within the const+type files, `GigBudgetType` uses traditional enum (line 35-39) while others use const+type pattern — **inconsistent within the same file.**

**Why It Matters:**
- Traditional enums create actual JavaScript objects at runtime
- Const+type pattern is tree-shakeable and more performant
- Mixed patterns cause type checking inconsistencies
- Makes the codebase harder to maintain

**Recommendation:** Standardize on const+type pattern across all files. Const+type is the modern TypeScript best practice, tree-shakeable, and avoids runtime overhead.

```typescript
// Standard pattern to use everywhere
export const GigStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',
} as const;
export type GigStatus = typeof GigStatus[keyof typeof GigStatus];
```

---

### 3. **Date Serialization Type Mismatch**
**Files:** All gig.types.ts files
**Examples:** Lines like `createdAt: Date;`, `updatedAt: Date;`, `dueDate: Date;`, `expiresAt?: Date;`

**Issue:** TypeScript interfaces use `Date` type, but when data travels over HTTP/JSON:
- Dates are serialized to ISO strings: `"2026-03-01T12:00:00Z"`
- On deserialization, they remain as strings, NOT `Date` objects
- Code expecting `.getTime()` or `.toLocaleDateString()` will crash

**Runtime Error Example:**
```typescript
const gig: Gig = await api.getGig(id); // gig.createdAt is actually a string!
gig.createdAt.getTime() // ❌ TypeError: gig.createdAt.getTime is not a function
```

**Current Types (Misleading):**
```typescript
export interface Gig {
  createdAt: Date;  // ❌ Misleading - actually a string from API
  updatedAt: Date;  // ❌ Misleading
  // ...
}
```

**Recommendation:** Change to string types or use a union type for clarity:

**Option 1 - String (Recommended for API contracts):**
```typescript
export interface Gig {
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
  // ... other fields
}
```

**Option 2 - Union type with helper function:**
```typescript
export interface Gig {
  createdAt: string | Date;
  updatedAt: string | Date;
  // ... and add a utility function to normalize
}

// Utility function
export function normalizeGigDates(gig: Gig): Gig & { createdAt: Date; updatedAt: Date } {
  return {
    ...gig,
    createdAt: new Date(gig.createdAt),
    updatedAt: new Date(gig.updatedAt),
  };
}
```

---

## 🟡 Warnings

### 4. **Missing Shared Type Exports in API**
**File:** `apps/api/src/shared/types/gig.types.ts`

**Issue:** The API's gig.types.ts file is not exported through a barrel file or index.ts. If apps/api were a published package, consumers wouldn't have a clean import path.

**Current State:**
- No `apps/api/src/shared/types/index.ts` exists
- No central export point in `apps/api/src`

**Recommendation:** Once the duplication is fixed and files are deleted, this becomes moot. But as a general practice, create barrel files for organized exports.

---

### 5. **Missing Type Standardization: API DTOs vs Type Definitions**
**File:** `apps/api/src/verticals/gigs/dto/gig.dto.ts` (not audited yet, should be)

**Issue:** No confirmation that API DTOs match the TypeScript types. DTOs are often defined separately from type definitions, creating a contract mismatch.

**Risk:** API might return fields that don't match the frontend types, or miss fields expected by the client.

**Recommendation:**
1. Check `apps/api/src/verticals/gigs/dto/gig.dto.ts`
2. Ensure DTOs align with `Gig`, `Application`, `GigMilestone`, etc. types
3. Consider using NestJS `class-validator` + OpenAPI decorators to generate types from DTOs, reducing duplication

---

### 6. **Optional vs. Required Fields - Potential Gaps**
**Files:** All gig.types.ts files

**Review Findings:**
- `Application.milestoneProposals?: MilestoneProposal[]` — Optional, but should this always be included?
- `Gig.creator?: PublicProfile` — Optional, but populated when gig includes details
- `Dispute.resolution?: string` — Optional until resolved, good pattern
- `GigMilestone.feedback?: string` — Optional, only when rejected

**Assessment:** Generally reasonable, but consider:
- Should `gig.creator` always be populated (required)?
- Should API always return `milestoneProposals` (empty array vs. undefined)?

**Recommendation:** Document when optional fields are populated and consider creating separate types:

```typescript
// Base type - what's always returned
export interface Gig {
  id: string;
  creatorId: string;
  // ... required fields
  creator?: never; // undefined here
}

// Detailed type - when including related data
export interface GigWithDetails extends Gig {
  creator: PublicProfile; // now required
}
```

The code already has this pattern (`GigWithDetails` extends `Gig`), which is good.

---

### 7. **No Discriminated Union for Status Fields**
**File:** All gig.types.ts files

**Issue:** Status fields use enums/const values, but types don't narrow based on status. Example:

```typescript
interface Dispute {
  status: DisputeStatus;
  resolution?: string; // optional, but ONLY valid if status = 'RESOLVED'
  resolvedAt?: Date;   // same here
}

// This compiles but is invalid:
const dispute = { status: 'OPEN', resolution: 'We agree to disagree' }; // ❌ logically wrong
```

**Recommendation:** Use discriminated unions for stricter type safety:

```typescript
export type Dispute =
  | { status: 'OPEN' | 'UNDER_REVIEW'; resolution?: never; resolvedAt?: never; /* other fields */ }
  | { status: 'RESOLVED'; resolution: string; resolvedAt: Date; /* other fields */ };
```

This ensures `resolution` and `resolvedAt` can only be set when `status` is 'RESOLVED'.

---

## 🟢 Good Practices Found

### 8. **No `any` Type Usage** ✅
Reviewed all gig.types.ts files — **zero instances of `any` type**. This is excellent for type safety.

---

### 9. **Clean Barrel Export Structure** ✅
`packages/types/src/index.ts` cleanly re-exports from domain files, organizing types by concern:
```typescript
export * from './gig.types';
export * from './api/gigs.api';
// ... other domains
```

This is a good organizational pattern.

---

### 10. **Separate Form/DTO Types from Domain Types** ✅
Types are organized into logical groups:
- Domain types: `Gig`, `Application`, `Dispute`, etc.
- API response types: `PaginatedGigs`, `GigWithDetails`, etc.
- Form input types: `CreateGigData`, `UpdateApplicationData`, etc.

This separation is good practice and makes contracts clear.

---

### 11. **Creator Tools Types Are Isolated** ✅
`packages/creator-tools/src/types.ts` defines its own domain and doesn't mix concerns with gigs types. No circular dependencies detected.

---

## Summary: Type System Health

| Category | Status | Notes |
|----------|--------|-------|
| **Type Consistency** | 🔴 Critical | 3x duplication, enum pattern inconsistency |
| **Type Safety** | 🟢 Good | No `any` types, good structure |
| **Serialization Accuracy** | 🔴 Critical | Date types misleading; should be strings |
| **Single Source of Truth** | 🔴 Critical | No centralized shared types; each app uses local copy |
| **Export Hygiene** | 🟢 Good | Clean barrel exports, no circular refs found |
| **Enum Patterns** | 🟡 Mixed | Traditional + const+type both used; needs standardization |
| **Optional/Required Fields** | 🟢 Good | Generally well-modeled |
| **Discriminated Unions** | 🟡 Not Used | Could improve type narrowing for status fields |

---

## Recommended Action Plan

### Phase 1: Fix Critical Issues (Highest Priority)
1. **Standardize enum patterns** to const+type across all gig.types.ts
   - Update `packages/types/src/gig.types.ts`
   - Delete duplicate files in apps/api and apps/web after migration

2. **Fix Date serialization**
   - Change all `Date` to `string` in gig.types
   - Document format as ISO 8601
   - Update client-side code to parse dates as needed

3. **Eliminate type duplication**
   - Delete `apps/api/src/shared/types/gig.types.ts`
   - Delete `apps/web/src/shared/types/gig.types.ts`
   - Update all imports to use `packages/types`

### Phase 2: Improve Type Precision (Medium Priority)
4. Add discriminated unions for status-dependent fields
5. Create type-safe status type helpers/utilities
6. Add JSDoc comments documenting when optional fields are populated

### Phase 3: Enhance Type System (Low Priority - Future)
7. Generate types from API DTOs to reduce duplication
8. Consider schema validation library (Zod, Valibot) for runtime safety
9. Add runtime type guards for API responses

---

## Files Requiring Changes

| File | Action | Priority |
|------|--------|----------|
| `packages/types/src/gig.types.ts` | Standardize enums to const+type, fix Date → string | 🔴 Critical |
| `apps/api/src/shared/types/gig.types.ts` | DELETE (move imports to packages/types) | 🔴 Critical |
| `apps/web/src/shared/types/gig.types.ts` | DELETE (move imports to packages/types) | 🔴 Critical |
| `apps/api/src/verticals/gigs/**/*.ts` | Update imports post-deletion | 🔴 Critical |
| `apps/web/src/**/*.ts` | Update imports post-deletion | 🔴 Critical |
| `packages/types/src/index.ts` | Verify all exports present | 🟡 Warning |
| `apps/api/src/verticals/gigs/dto/gig.dto.ts` | Review alignment with types | 🟡 Warning |

---

## Cross-Domain Consistency Check

**Creator Tools vs. Gigs Domain:** ✅ No overlap or conflicts detected. Types are properly isolated by domain.

---

## Conclusion

The Embr monorepo's type system has **good organizational structure** but suffers from **critical duplication and inconsistency issues**. The main problems are:

1. **Type definitions exist in three places** instead of one shared source
2. **Enum patterns are inconsistent** (traditional vs. const+type)
3. **Date types don't match runtime serialization** (JSON strings ≠ Date objects)

Fixing these issues will significantly improve type safety, maintainability, and reduce the risk of bugs caused by out-of-sync type definitions. Priority should be given to eliminating duplication and standardizing patterns.
