# Finding: f-perf-006

> **Status:** open | **Severity:** major | **Priority:** P1 | **Type:** enhancement | **Confidence:** evidence

## Title

Multipart presigned URL generation is sequential per part

## Description

S3 multipart URL generation loops with awaited signing per part, producing linear latency growth for large uploads.

## Proof Hooks

### [code_ref] Serial await in part signing loop

- File: `apps/api/src/core/media/services/s3-multipart.service.ts`

- Symbol: `getPresignedPartUrls`

- Lines: 168-178

### [command] Expected bounded concurrency behavior

- Expected: Parallel signing with capped concurrency (e.g., 5-10) for lower tail latency

- Actual: Serial signing across all parts


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

Slow upload initialization for large files and increased request timeout risk.


## Suggested Fix

**Approach:** Generate part URL promises with bounded concurrency and preserve part order in output.

**Affected files:** `apps/api/src/core/media/services/s3-multipart.service.ts`

**Effort:** small

**Risk:** Need to avoid overwhelming signer if unconstrained.


## Tests Needed

- [ ] Unit test validating URL count/order and reduced elapsed time for high part counts


## Related Findings

_(none)_


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
