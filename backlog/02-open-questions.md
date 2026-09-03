# Open Questions

## Is there a weekly reason to open it?

The whole plan rests on this. Phase 0 answers it by dogfooding: keep a note
for two weeks of what you wish you had known about your own week. If the
note stays empty, archive the project.

## Web app, CLI, or agent skill? (decided: CLI, 2026-09-02)

- **Web app**: exists, has charts, works for non-terminal people. Most code to
  maintain. LLM calls from the browser need the user's key in LocalStorage.
- **CLI**: `devorbit retro --since 7d` reads via `gh`, computes facts, calls a
  model, prints or writes markdown. Tiny surface, easy to cron, fits the
  privacy story, no auth UI at all since `gh auth` already exists.
- **Agent skill**: a SKILL.md plus a few scripts that Claude Code or another
  agent runs. Almost no code, but ties the product to a specific agent
  ecosystem and is hard to give to someone who does not use one.

Decided: CLI first, and the web UI does not come back. Static HTML and PDF
exports cover reading. Vite and the React stack are removed.

## Exports: HTML first or PDF first?

Sheets was dropped 2026-09-02. Between the two that remain, HTML is nearly
free and PDF is best produced from the HTML anyway, so HTML first. The
open part is the PDF renderer: headless browser (heavy, high fidelity)
versus a pure-Node markdown-to-PDF route (light, plainer). Decide when a
PDF is actually needed.

## What replaces charts? (decided: inline SVG, 2026-09-02)

The report is meant to be rich, so charts are in. They are generated in
Node as inline SVG from the facts JSON, no runtime library, so the file
works offline and prints. See `ideas/rich-report.md`. Remaining question
is which charts earn their place; start with the ones listed there and
cut any the narrative never references.

## Which model, and how much does a weekly retro cost?

A week of one engineer's PRs, reviews, and commit messages is probably 20k to
80k tokens of input. Need a real measurement before deciding whether to
summarise per PR first or send everything at once. Ollama for free local
runs should be a first-class option, not an afterthought.

## How do we keep the narrative honest?

LLMs will happily invent a trend. Rule: the model only narrates facts we
computed and passed in, and every sentence that makes a claim must cite a PR
or commit URL from the input. Anything else gets stripped. Worth a small
eval set of hand-checked weeks.

## What about the existing code?

Decided 2026-09-02: delete the front end. The only pieces worth reading
before deletion are the GitHub fetch logic in `src/services/gitProviders.js`
and the pairing calculation in `TeamCompatibility.jsx`. Git history keeps
everything else.
