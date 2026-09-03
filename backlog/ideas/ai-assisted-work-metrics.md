---
title: Metrics on AI-assisted work
status: idea
phase: 3
effort: M
value: high
depends: [person-centric-data-model]
---

## Problem
A growing share of commits are written with coding agents, and nobody has
a personal view of how that work performs. Commit count says nothing.
Rework rate on agent-written code does.

## Proposal
Detect AI involvement from commit trailers (`Co-Authored-By: Claude`,
`Claude-Session:`, Copilot and Cursor equivalents) and PR body markers.
Compute, for AI-assisted vs not: revert rate, follow-up fix commits
touching the same files within 14 days, review rounds, time to merge.
Cluster rework by directory.

Narrative: "38% of your commits this quarter were agent-assisted. They
merged faster but were reworked at twice the rate, mostly in `src/auth`."

## Notes
This did not exist as a category in the GitPrime era because the data did
not exist. It is the freshest angle in the backlog and the one most likely
to get attention if written up. Detection will be noisy; report the
detection rule alongside the numbers.
