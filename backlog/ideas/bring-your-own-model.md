---
title: Bring your own model
status: planned
phase: 2
effort: M
value: high
depends: [unified-data-layer]
---

## Problem
The narrative retro needs an LLM. DevOrbit has no server and should not
get one just to proxy model calls.

## Proposal
A provider interface with three implementations: Anthropic, OpenAI, and
Ollama (local, free, private). The key lives with the user. Default to
Ollama if it is detected running locally.

Keep prompts in versioned files, not string literals, so they can be
diffed and evaluated.

## Notes
Measure a real week of one engineer's data in tokens before deciding
between one big call and a per-PR summarise-then-synthesise pipeline. See
`../02-open-questions.md`.
