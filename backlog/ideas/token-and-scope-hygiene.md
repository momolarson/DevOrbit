---
title: Token storage and minimal scopes
status: idea
phase: 1
effort: S
value: medium
depends: []
---

## Problem
A classic PAT with `repo` scope sits in LocalStorage. That is full write
access to every repo the user can reach, in the most XSS-exposed storage
there is.

## Proposal
Ask for a fine-grained token with read-only Contents, Pull requests, and
Metadata permissions. Document exactly which permissions and why. If the
delivery form becomes a CLI, drop token handling entirely and use
`gh auth token`.

For the web form, consider the OAuth device flow, which needs no client
secret in the bundle. The current `.env.example` asks for a client secret,
which should never ship in a front-end build.
