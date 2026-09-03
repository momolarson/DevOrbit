---
title: PR hygiene coach
status: idea
phase: 3
effort: M
value: high
depends: [ai-narrative-retro]
---

## Problem
The things that make a PR slow to review are visible in the data but no
one looks: size, description length, whether the title says what or why,
how many review rounds it took, how often it got force-pushed after
review started.

## Proposal
Per-PR facts: additions and deletions, files changed, description word
count, presence of a linked issue, time to first review, review rounds,
commits after first review, reverted within 14 days. Correlate across
your own PRs: which of your PRs got reviewed fast, and what did they have
in common? Feed the correlation into the retro narrative.

## Notes
Careful with the framing. This is about your own PRs getting stuck, not
about scoring reviewers.
