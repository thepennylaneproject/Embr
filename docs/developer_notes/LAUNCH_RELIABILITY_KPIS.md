# Launch Reliability KPIs

This baseline tracks launch-blocking reliability signals for auth, checkout, and draft preservation.

## Event Capture

Client events are persisted in local storage via `apps/web/src/lib/reliability.ts`:

- `auth_401_retry_started`
- `auth_401_retry_succeeded`
- `auth_401_retry_failed`
- `checkout_confirmed`
- `checkout_failed`
- `draft_restored`
- `post_create_failed`

## Primary KPI Definitions

- `auth_401_retry_success_rate`
  - Formula: `auth_401_retry_succeeded / auth_401_retry_started`
  - Target: >= 95%

- `checkout_confirmation_rate`
  - Formula: `checkout_confirmed / (checkout_confirmed + checkout_failed)`
  - Target: >= 99%

- `draft_restore_rate`
  - Formula: `draft_restored / draft_sessions_started`
  - Target: monitor trend; should increase as autosave adoption grows.

## Release Gate Use

Before launch:

1. Run 5 critical journey drills (auth, post, event, groups, marketplace).
2. Export captured reliability events from local storage.
3. Verify no silent checkout successes without `checkout_confirmed`.
4. Verify interrupted form sessions restore drafts in all covered flows.
