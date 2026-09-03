---
title: Tests that test something
status: idea
phase: 1
effort: M
value: medium
depends: [unified-data-layer]
---

## Problem
There is one test file for `App.jsx`. The facts computation in the retro
is exactly the kind of code that silently drifts without tests.

## Proposal
Unit tests for every fact function against fixture JSON captured from the
real API (scrubbed). A snapshot test for the facts document over a fixed
fixture week. Keep the LLM out of the test suite except for the small
hand-checked eval set, which runs on demand and not in CI.
