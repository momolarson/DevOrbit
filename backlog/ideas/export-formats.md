---
title: Export retro to static HTML and PDF
status: planned
phase: 2
effort: M
value: high
depends: [ai-narrative-retro, cli-or-agent-skill-delivery]
---

## Problem
A CLI writes text to a terminal. The retro needs to leave the terminal
to be useful: read on a phone, handed to a manager, kept in a folder.
These exports replace the web interface entirely, and the HTML one is the
product's primary surface, not a secondary format. What the report
contains is in `rich-report.md`; this file is about producing the files.

## Proposal
`devorbit export` takes a retro (markdown plus its facts JSON) and writes:

- **HTML**: a single self-contained file. Inline CSS, no external assets,
  works from `file://`. The narrative sections come from the model as
  markdown and are rendered into the template; charts are inline SVG
  generated from the facts. Ships first and is the default output of
  `devorbit retro`.
- **PDF**: render the HTML export through a headless browser
  (Playwright or Puppeteer) or a lighter markdown-to-PDF route. Headless
  browser gives the best fidelity but is a heavy dependency; make it an
  optional install. The old web app used jsPDF, which is fine for text and
  poor for layout.

Order: HTML first, PDF from the HTML. Markdown stays available as a
plain fallback (`--format md`) for pasting into a doc or a chat.

Trend over time, which Sheets would have given, comes instead from keeping
every week's facts JSON in a local folder and letting a later `devorbit
trend` command read across them.

## Notes
Google Sheets export was in the first draft and dropped on 2026-09-02:
third-party write, OAuth flow, no concrete use.

Keep a stable facts schema with a version field anyway, because the local
folder of past weeks outlives code changes.
