---
title: The weekly retro (the wedge)
status: planned
phase: 2
effort: L
value: high
depends: [person-centric-data-model, bring-your-own-model]
---

## Problem
Dashboards show you numbers you already know. The thing an engineer
actually wants is what a good mentor gives in a 1:1: someone who read your
work and noticed something.

## Proposal
Two stages, strictly separated:

1. **Facts**: deterministic code computes a JSON document. PRs opened,
   merged, size, time to first review, review rounds, reverts, comments
   given and received with classification, repos touched, and so on. Every
   fact carries the URLs it came from.
2. **Narrative**: the model receives only the facts document and a prompt
   that says: narrate what changed, what stands out, one thing to try next
   week, and cite a URL for every claim. Output is markdown per section,
   which the report template renders alongside the charts (see
   `rich-report.md`).

Post-process: drop any sentence containing a claim with no URL from the
input. Show the facts JSON on demand so the user can check the model's
work.

Windows: weekly by default, with `--since` for arbitrary ranges.

Actionable is a hard requirement. The prompt asks for two or three "try
this next week" items; each must cite a fact from the input, and any that
does not is dropped in post-processing. A retro with zero grounded
actions is reported as such rather than padded.

## Notes
This is the product. Everything in Phase 1 exists to make this possible
and everything in Phase 3 makes it sharper. Build a tiny eval set: five
hand-checked weeks, and rerun on prompt changes.
