---
title: The report: rich, pretty, and actionable
status: planned
phase: 2
effort: L
value: high
depends: [ai-narrative-retro, export-formats]
---

## Problem
A wall of markdown in a terminal is not the experience. The point of the
original web app was a rich, visual report. That goal survives the move
to a CLI: the output has to look good and every section has to end in
something you can do.

## What the report is
One self-contained HTML file per run (and a PDF rendered from it). It is
the product's face; the terminal output is a summary pointing at it.

Structure, top to bottom:

1. **Headline**: the window, three or four numbers that changed, one
   sentence from the model on what kind of week it was.
2. **What you shipped**: merged PRs grouped by theme, each with size,
   time to merge, and a one-line model summary. Sparkline of merges per
   day.
3. **Where things got stuck**: PRs with long time to first review or many
   review rounds, with the model's read on why (size, thin description,
   no linked issue). Chart: time to first review vs PR size, your PRs as
   points.
4. **Reviews you gave and got**: comment counts by category (nit,
   question, blocking, praise), given vs received, side by side. Who
   reviewed you, who you reviewed.
5. **AI-assisted work**: share of agent-assisted commits, rework rate
   compared with the rest, where the rework clusters. (Phase 3; section
   hidden until the data exists.)
6. **Try this next week**: two or three concrete actions, each tied to a
   fact above with its link. This is the section the whole report exists
   for. If the model cannot ground an action in a fact, it does not
   appear.
7. **Appendix**: the facts table, collapsible, and a link to the raw JSON.

Every number links to the PR, commit, or comment that produced it.

## How it is built
- Charts are generated in Node as inline SVG from the facts JSON. No
  runtime library, so the file works offline, prints cleanly, and the
  PDF renderer needs no JavaScript. `d3-shape` and `d3-scale` on Node
  are enough; the DOM is not needed.
- Optional inline script for hover tooltips and section collapsing;
  everything must read correctly with scripts disabled.
- One template, one stylesheet, light and dark via `prefers-color-scheme`,
  print stylesheet for the PDF.
- Typography and layout follow the design engineering skills already
  installed; treat the report like an editorial page, not a dashboard
  grid.

## Notes
"Actionable" is a constraint on the model prompt, not just on the layout:
the narrative must produce actions and each action must cite a fact. See
`ai-narrative-retro.md`.
