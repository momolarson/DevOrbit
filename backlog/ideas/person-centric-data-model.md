---
title: Person-centric data model across repos
status: planned
phase: 1
effort: M
value: high
depends: [github-only]
---

## Problem
The app asks you to pick one repo, then shows everyone in it. An engineer
works across several repos and cares about their own activity. This is the
single biggest reason the current version feels like a manager tool.

## Proposal
The root object is "me over a time window", not "a repo". Fetch:

- PRs I authored: `search/issues?q=is:pr author:@me created:>DATE`
- PRs I reviewed: `search/issues?q=is:pr reviewed-by:@me`
- Review comments I wrote and received, per PR
- Commits I authored, via the PRs or `search/commits?q=author:@me`

Group by repo afterwards for display, never before.

## Notes
The search API has its own rate limit (30 requests a minute) and caps at
1000 results. Fine for one person over a quarter. GraphQL can fetch a PR
with its reviews and comments in one round trip, which the REST version
does as three.
