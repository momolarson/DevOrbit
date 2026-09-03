---
title: Classify review comments given and received
status: idea
phase: 3
effort: M
value: medium
depends: [bring-your-own-model]
---

## Problem
"14 comments received" says nothing. Were they nitpicks, questions,
blocking issues, or praise? Same for the comments you leave on others'
PRs. The first version had a "Brief Comments" metric based on character
count, which is the wrong proxy.

## Proposal
Run each review comment through a small classification prompt: category
(nit, question, suggestion, blocking, praise, discussion), and whether it
caught something that later changed the code. Aggregate for the retro:
"Most of the review you receive is style nits; the two blocking comments
this month were both about error handling."

## Notes
This is the one GitPrime never did well and an LLM does trivially. Cache
classifications per comment ID so they are only paid for once.
