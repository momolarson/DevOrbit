---
title: Fix or drop the "AI-powered" story point estimator
status: idea
phase: later
effort: S
value: low
depends: [github-only]
---

## Problem
`storyPointEstimator.js` is labelled AI-powered and is a velocity
heuristic over Linear issue data. With Linear set aside there is nothing
for it to read.

## Proposal
Remove it with the Linear provider. If estimation comes back later, it
comes back as a model reading the issue text plus your history of similar
PRs, and it gets labelled honestly.
