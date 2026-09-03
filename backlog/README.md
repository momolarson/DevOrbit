# DevOrbit Backlog

This folder is the project's thinking space. It holds the direction decision,
the open questions, and one file per idea.

## Layout

- `00-vision.md` — where the project stands, the recommended direction, and the phased plan. Read this first.
- `01-decisions.md` — decisions made, with the reasoning. Append-only; reverse a decision by adding a new entry.
- `02-open-questions.md` — things we do not know yet and how we plan to find out.
- `ideas/` — one markdown file per idea, with frontmatter.

## Idea file format

```markdown
---
title: Short name
status: idea | planned | in-progress | done | dropped
phase: 0 | 1 | 2 | 3 | later
effort: S | M | L        # S = a sitting, M = a few days, L = a week or more
value: low | medium | high
depends: [other-idea-slugs]
---

## Problem
## Proposal
## Notes / open questions
```

## Working the backlog

1. New idea: add a file under `ideas/` with `status: idea`. Keep it short. A problem statement and a one paragraph proposal is enough.
2. When it is next up: set `status: planned` and fill in enough detail that a session could start on it cold.
3. When shipped or abandoned: set `status: done` or `dropped` and add a line saying why. Do not delete files; dropped ideas are useful history.
4. Any decision that shapes more than one idea goes in `01-decisions.md`.

To list what is planned: `grep -l "status: planned" backlog/ideas/*.md`
