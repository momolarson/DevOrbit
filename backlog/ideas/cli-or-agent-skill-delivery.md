---
title: Deliver as a CLI (or agent skill) instead of a web app
status: planned
phase: 0
effort: M
value: high
depends: [dogfood-the-question]
---

## Problem
A React dashboard is the heaviest possible way to deliver a weekly text
report. Most of the 7k existing lines are UI for a per-repo view we are
moving away from.

## Proposal
`devorbit retro --since 7d` as a Node CLI. Auth via `gh auth token` so there
is no login flow at all. Fetch, compute facts to JSON, call a model, write
markdown to stdout or a file. Cron it on Monday morning.

The web app can return later as a viewer over the same facts JSON, which
keeps the two from diverging.

An agent skill variant (a SKILL.md plus scripts for Claude Code) is even
less code, but ties the product to people who use that agent. Consider
shipping both from the same core: the CLI is the product, the skill is a
thin wrapper that runs it.

## Notes
Decided 2026-09-02: CLI first. Proposed shape:

```
devorbit auth            # verifies gh auth, checks scopes
devorbit facts --since 7d [--json out.json]
devorbit retro --since 7d [--model ollama|anthropic|openai] [--out retro.md]
devorbit export retro.md --html | --pdf | --sheets
```

`facts` and `retro` are separate commands on purpose: facts are free and
deterministic, retro costs tokens. Cron `retro` on Monday morning.
