# Finding: f-perf-012

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** question | **Confidence:** speculation

## Title

Need EXPLAIN ANALYZE for heavy social discovery raw SQL and trending hashtag scan

## Description

Raw SQL in follow/discovery services and full 24h hashtag scans may require additional indexes or query rewrite, but execution plans are unavailable.

## Proof Hooks

### [code_ref] Raw SQL joins/NOT EXISTS in network suggestion query

- File: `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts`

- Symbol: `getSuggestedFromNetwork`

- Lines: 466-495

### [code_ref] Raw SQL joins/NOT EXISTS in mutual recommendation query

- File: `apps/api/src/verticals/feeds/social-graph/services/user-discovery.service.ts`

- Symbol: `getMutualConnectionUsers`

- Lines: 487-518

### [code_ref] Trending hashtag query loads all recent hashtags for in-memory aggregation

- File: `apps/api/src/verticals/feeds/content/services/posts.service.ts`

- Symbol: `getTrendingHashtags`

- Lines: 700-724

### [command] Execution plan request

- Command: `Run EXPLAIN (ANALYZE, BUFFERS) for the two raw SQL recommendation queries and for equivalent SQL of trending hashtags window scan`

- Expected: Index scans on follow/block join keys, bounded sort cost, acceptable row estimates

- Actual: Unknown; profiling data not available


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Unknown until measured; risk of hidden full scans and sort spill at scale.


## Suggested Fix

**Approach:** Capture query plans in staging with realistic cardinality; add/adjust composite indexes only where plans confirm bottlenecks.

**Affected files:** `apps/api/src/verticals/feeds/social-graph/services/follows.service.ts` `apps/api/src/verticals/feeds/social-graph/services/user-discovery.service.ts` `apps/api/src/verticals/feeds/content/services/posts.service.ts` `apps/api/prisma/schema.prisma`

**Effort:** small

**Risk:** Do not guess plans; collect evidence first.


## Tests Needed

- [ ] Plan snapshots and latency benchmarks in CI/perf env


## Related Findings

- `f-perf-011`


## Timeline

- 2026-03-05T19:44:51.494026Z | performance-cost-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
