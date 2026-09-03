---
title: One data service with real pagination and cache
status: planned
phase: 1
effort: M
value: high
depends: [github-only]
---

## Problem
About 40 fetch call sites spread across components. Pagination stops at
`per_page=100`, so any active repo shows partial data without saying so.
Caching is ad hoc in LocalStorage with no expiry policy.

## Proposal
A single `github.js` service that owns all network access. Full pagination
via the `Link` header or GraphQL cursors. Cache in IndexedDB keyed by
query and window, with a since-timestamp so repeat runs fetch only what is
new. Components (or the CLI) call the service and never `fetch` directly.

Expose rate limit remaining and surface it in the UI or CLI output.

## Notes
This is the piece of the existing code most worth carrying forward in
spirit. `gitProviders.js` has a start on it.
