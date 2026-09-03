# DevOrbit

**A personal engineering retro, narrated by AI, over your own GitHub activity.**

Engineer-first. Local-first. Open source.

Tools like GitPrime, Pluralsight Flow, LinearB, and Swarmia point analytics
at engineers on behalf of managers. DevOrbit points them at yourself, on your
own machine, for your own benefit. It reads what you shipped, reviewed, and
discussed, computes the facts, and produces a rich report that tells you
something you could not easily see yourself, with a link to the evidence
behind every claim, and two or three things worth trying next week.

> **Status: early rebuild.** The first version (2025) was a React dashboard.
> It is being rebuilt as a CLI. Today it computes the facts document. The
> narrated HTML report is next. See [`backlog/`](backlog/) for the plan.

## Install

Requires Node 22+ and the [GitHub CLI](https://cli.github.com/) logged in
(`gh auth login`), or a `GITHUB_TOKEN` in the environment.

```bash
git clone https://github.com/momolarson/DevOrbit.git
cd DevOrbit
npm install
node bin/devorbit.js auth
```

## Use

```bash
# Facts about your last week, across every repo you touched
node bin/devorbit.js facts --since 7d

# A quarter, printed to stdout
node bin/devorbit.js facts --since 3m --stdout | jq .summary
```

The facts document includes, per PR you authored: size, description length,
linked issue, time to first human review, review rounds, commits after
review started, reviewers, and whether an AI coding agent was involved.
Per PR you reviewed: your response time and your comments. Plus commits
across all repos, comments given and received, and who you collaborate
with. Facts land in `~/.devorbit/facts/` by default.

## What it does not do

- It does not send your data anywhere except api.github.com. (Phase 2 will
  add an optional model call with your own key or a local model.)
- It does not rank people. Collaborator counts describe who you work with.
- It does not measure productivity by commit count. Those numbers are in
  the facts because they are facts, not because they matter.

## Roadmap

See [`backlog/00-vision.md`](backlog/00-vision.md). Short version: facts
(done), bring-your-own-model narration, a rich self-contained HTML report
with charts and grounded actions, PDF export, then a PR hygiene coach,
review comment classification, and metrics on AI-assisted work.

## Contributing

Ideas go in `backlog/ideas/` as a markdown file with the frontmatter shown
in `backlog/README.md`. Tests run with `npm test`. If you use Claude Code or
a similar agent, `npx skills add emilkowalski/skill` installs the design
engineering skills used for the report template; they are not committed.

## License

MIT
