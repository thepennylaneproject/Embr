# PR Merge Queue

When several approved pull requests are ready at the same time, use GitHub's merge queue instead of merging them one by one.

## Why

- It keeps the existing PR review flow.
- It re-runs CI on the combined merge group before changes land on `main`.
- It avoids the "merge one PR, wait for CI, merge the next PR" bottleneck when a backlog builds up.

## Repository Support

`.github/workflows/ci.yml` now listens to the `merge_group` event in addition to `push` and `pull_request`, so the required `CI / validate` check can run for queued merge groups.

## Recommended Setup

1. In GitHub, open **Settings → Branches** (or the repository ruleset that protects `main`).
2. Require a pull request before merging.
3. Require at least one approval.
4. Require status checks to pass before merging.
5. Enable **Require merge queue**.
6. Mark the `CI / validate` workflow check as required.

If `develop` is also protected, apply the same settings there.

## Recommended Maintainer Workflow

1. Get the PR approved.
2. Confirm the PR branch is up to date and `CI / validate` is green.
3. Add the PR to the merge queue instead of clicking a direct merge button.
4. Let GitHub re-run CI for the queued merge group and merge in queue order.

## Notes

- The deploy workflow still only runs after changes reach `main`.
- Merge queue support does not replace branch protection; it depends on branch protection being enabled in GitHub settings.
