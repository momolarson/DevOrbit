---
title: Collaboration view without rankings
status: idea
phase: later
effort: M
value: medium
depends: [person-centric-data-model]
---

## Problem
The existing Team dashboard compares people and flags "Review Load
Imbalance" and "Knowledge Concentration Risk". Those are manager views and
they are the part of GitPrime engineers hated.

## Proposal
Keep one collaboration view and make it about the user: who reviews your
work, whose work you review, whose comments most often change your code,
who you have not worked with in a while. Never a leaderboard, never a
per-person score.

## Notes
Passes the private-notebook test in `../01-decisions.md`. The old
`TeamCompatibility` component has a reusable pairing calculation.
