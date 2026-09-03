---
title: Remove the web front end and Vite
status: planned
phase: 1
effort: S
value: high
depends: []
---

## Problem
The React app, Vite, Tailwind, Chart.js, react-table, framer-motion, jsPDF,
and the Jest and Babel setup around them exist to serve a per-repo
dashboard that is no longer the product. Keeping them means every change
carries a bundler and a UI nobody opens.

## Proposal
On a branch:

1. Read `src/services/gitProviders.js` once and note anything worth
   carrying into the new GitHub service (pagination handling, endpoint
   list). Skim `TeamCompatibility.jsx` for the reviewer pairing logic.
2. Delete `src/`, `index.html`, `vite.config.js`, `tailwind.config.js`,
   `postcss.config.js`, `babel.config.cjs`, `jest.config.js`, `coverage/`,
   `test-linear.js`, `INTEGRATION_TEST.md`, and `.env.example`.
3. Write a fresh `package.json` for a Node CLI: `bin` entry, `type:
   module`, Node 22 or newer, a test runner (`node --test` is enough), and
   no build step.
4. Rewrite `README.md` and `CLAUDE.md` for the CLI. Both currently describe
   the dashboard.
5. Update `.github/workflows` to run lint and tests without Vite.

## Notes
Nothing here is lost; git history has it all. Decision recorded in
`../01-decisions.md` on 2026-09-02.
