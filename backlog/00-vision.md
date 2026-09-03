# DevOrbit: Where It Stands and Where It Could Go

Written 2026-09-02, after a review of the codebase and its history.

## The original idea

GitPrime (later Pluralsight Flow) gave engineering managers metrics on commits,
code churn, PR review flow, and team collaboration. It was useful and it was
also widely disliked by engineers, because it was a manager pointing a
dashboard at them.

DevOrbit's twist was to flip that: the same kind of insight, open source, run by
the engineer on their own work, for their own benefit. That twist is still the
most valuable thing in the project. Every commercial tool in this space
(Pluralsight Flow, LinearB, Swarmia, Jellyfish, DX, Waydev) sells to the
manager. An engineer-first tool is a real gap.

## What exists today

Built over two days in July 2025 and untouched since. Roughly 7k lines of
React, client-side only.

What it does:

- Per-repository dashboards for commits, PR comments, code churn, and team
  collaboration, pulling from the GitHub REST API.
- Threshold-based "insights" such as "Large Commits Detected" or "Limited
  Test Files".
- Providers for Bitbucket, Linear, and Jira in addition to GitHub.
- A story point estimator that is labelled AI-powered but is a velocity
  heuristic.
- CSV and PDF export.

Honest problems:

- **It is repo-centric, not person-centric.** An individual engineer works
  across several repos. The current model asks you to pick one repo and then
  shows you everyone in it. That is the manager's view, not the engineer's.
- **The metrics are activity proxies.** Commits per day, lines added, files
  touched. These were already weak signals in the GitPrime era. In 2026, when a
  large share of code is written with AI agents, they are close to
  meaningless. Nobody should optimise their commit count.
- **The insights are static thresholds.** They will say the same thing every
  week, and they say things you already know about your own work.
- **Breadth over depth.** Four providers, six dashboards, an estimator, and
  export, none of them finished. Jira cannot work at all from a browser
  without a proxy (the code even ships a component explaining the CORS
  problem).
- **The architecture will not carry more weight.** Each component fetches its
  own data (about 40 fetch call sites), pagination stops at 100 items, caching
  is ad hoc in LocalStorage, and there are almost no tests.

None of this is a criticism of the experiment. It did what an experiment is
for: it proved the idea is buildable and it surfaced what the real product
question is.

## The real product question

Why would an engineer open this every week?

A dashboard of your own commit counts does not answer that. Here is what
would: **the tool reads your actual work and tells you something you could
not easily see yourself, in plain language, with evidence.**

That is exactly what a good mentor or a good manager does in a 1:1, and it is
exactly what an LLM can now do over a GitHub API feed. This is the AI spin,
and it is not a gimmick bolted onto a dashboard. It replaces the dashboard as
the core.

Examples of what that looks like:

- "Your PRs this month averaged 900 lines. The three that got reviewed within
  a day were all under 200. Reviewers asked 'why is this needed' on four of
  the large ones, which suggests the descriptions are not carrying the intent."
- "You reviewed 14 PRs. 11 of your comments were nitpicks on style, 2 caught
  logic issues. Your teammate's review on #412 caught a bug you approved past."
- "Here is a draft of your quarterly self-review, with a link to each PR
  backing every claim."
- "38% of your commits this quarter carry an AI co-author trailer. Those
  commits were reverted or reworked at 2x the rate of the others. The rework
  clusters in the auth module."

That last one is a genuinely new category of metric. Nobody had it in the
GitPrime era because the data did not exist. Claude Code and other agents now
stamp trailers on commits, so it does.

## Recommendation

**Do not drop the idea. Drop the current shape.**

Keep: the name, the engineer-first principle, the local-first privacy stance,
the MIT licence, and the lesson that the GitHub data layer is the hard part.

Let go of: the per-repo dashboard model, the activity-count metrics as the
headline, the Bitbucket and Jira and Linear providers for now, the team
comparison views, and probably most of the existing components. Rebuilding a
narrow thing is faster than bending a broad thing.

Narrow to one wedge: **an AI-narrated personal engineering retro**, weekly and
quarterly, over your GitHub activity across all repos, with every claim
linked to evidence. It is delivered as a rich HTML report (and PDF): charts
generated from the facts, narrative from the model, and a "try this next
week" section that every other section exists to justify. Pretty and
actionable are both requirements, whatever the interface. Everything else
in the backlog either feeds that wedge or waits behind it.

Decision rule for the future: if a feature would make sense in a manager's
dashboard but not in a private notebook, it does not belong here.

## Phased plan

### Phase 0: Decide (one or two sittings)

- Dogfood the question. For two weeks, write by hand what you wish a tool had
  told you about your own week. If nothing comes up, that is the answer and
  the project can be archived with a clear conscience.
- Delivery form decided: a Node CLI, no web interface, no Vite. Output is
  markdown with static HTML and PDF exports. See `ideas/cli-or-agent-skill-delivery.md`
  and `ideas/export-formats.md`.
- Record the decision in `01-decisions.md`.

### Phase 1: Foundation

- Delete the React front end and the Vite, Tailwind, and Chart.js stack.
  Fresh `package.json` for a CLI. Read `gitProviders.js` once before it goes.
- GitHub only. Remove the other providers.
- Person-centric data model: "my PRs, my reviews, my commits, across repos".
- One data service with full pagination, GraphQL where it saves round trips,
  and a real cache (IndexedDB).
- Fine-grained token with minimal scopes.

### Phase 2: The wedge

- Bring-your-own-model: Anthropic or OpenAI key, or Ollama, called from the
  client. No DevOrbit server.
- The weekly retro: structured facts computed locally, then an LLM narrative
  over those facts with links back to PRs and commits.
- The report: one self-contained HTML file with inline SVG charts, narrative
  sections, and grounded actions; PDF rendered from it. Designed, not just
  templated. See `ideas/rich-report.md`.
- The quarterly brag doc as the same pipeline with a longer window.

### Phase 3: Depth

- PR hygiene coach (size, description quality, time to first review, rework).
- Review comment classification and tone, for reviews you give and receive.
- AI-assisted work metrics from co-author trailers.

### Later

- Collaboration view (who you work with, never a ranking).
- Other git hosts, once the GitHub version is something people use.

## What success looks like

Not stars. One engineer, ideally you, reading the Monday retro and changing
something about how they work that week because of it.
