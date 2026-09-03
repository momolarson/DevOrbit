---
title: Narrow to GitHub only
status: done
phase: 1
effort: S
value: high
depends: []
---

## Problem
Bitbucket, Linear, and Jira providers exist but none is finished, Jira
cannot work from a browser without a proxy, and every feature has to be
written three times or left inconsistent.

## Proposal
The whole front end is being deleted (see `remove-web-frontend.md`), which
takes the Linear and Jira dashboards with it. What this idea adds: the new
CLI's data layer targets GitHub only, with a provider interface shape left
open so Bitbucket could return later. Do not port the Bitbucket, Jira, or
Linear classes.

## Notes
Decision recorded in `../01-decisions.md`.

Done 2026-09-02. The new `src/github` layer targets GitHub only.
