# Finding: f-security-f-021

> **Status:** open | **Severity:** minor | **Priority:** P2 | **Type:** bug | **Confidence:** inference

## Title

No Content-Security-Policy header in Next.js frontend

## Description

The Next.js security headers configuration includes X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy, but no Content-Security-Policy. Without a CSP there is no browser-enforced defense against injected scripts reading DOM content, intercepting fetch() responses containing tokens (F-012), or exfiltrating data. The deprecated X-XSS-Protection: 1; mode=block header is also present. No Strict-Transport-Security header is configured.

## Proof Hooks

### [code_ref] Location referenced by source agent

- File: `apps/web/next.config.js`


## Reproduction Steps

_(Optional for enhancements, debt, and questions.)_


## Impact

See description and proof hooks.


## Suggested Fix

**Approach:** Add a Content-Security-Policy header restricting script-src to 'self' and explicitly whitelisted CDN origins. Add Strict-Transport-Security: max-age=31536000; includeSubDomains. Remove the deprecated X-XSS-Protection header (it provides no protection in modern browsers and can cause issues in older ones).

**Affected files:** `apps/web/next.config.js`

**Effort:** small

**Risk:** 


## Tests Needed

- [ ] Add targeted verification tests/checks


## Related Findings

_(none)_


## Timeline

- 2026-03-05T19:44:51.494026Z | security-privacy-auditor | created | Imported from agent output during synthesis


## Artifacts

_(none)_


## Enhancement Notes

_Future improvements related to this surface area can be noted here._


## Decision Log (for type: question)

- **Decision:** _(pending)_
- **Decided by:** _(solo-dev)_
- **Date:** _(YYYY-MM-DD)_
- **Reasoning:** _(pending)_
