# DevOrbit

An AI-narrated personal engineering retro over your GitHub activity. A Node
CLI, engineer-first, local-first. It reads what you shipped, reviewed, and
discussed, computes facts, and (Phase 2) has a model narrate them into a
rich HTML report with grounded, actionable suggestions.

Direction, decisions, and the idea backlog live in `backlog/`. Read
`backlog/00-vision.md` and `backlog/01-decisions.md` before proposing
features. The test for any feature: would it make sense in a manager's
dashboard but not in a private notebook? Then it does not belong.

## Layout

```
bin/devorbit.js        entry point
src/cli.js             command dispatch and help
src/commands/          one file per command (auth, facts)
src/github/            auth (gh token), client (GraphQL + REST, pagination), queries, fetchers
src/facts/             pure transform from raw GitHub data to the facts document; schema version
src/util/              time windows, AI-assistance detection, text helpers
test/                  node:test suites with scrubbed fixtures in test/fixtures
backlog/               vision, decisions, open questions, ideas/
```

## Principles that shape the code

- **Facts and narrative are separate stages.** `src/facts` is deterministic
  and testable with fixtures. The model (Phase 2) only ever sees the facts
  document and must cite a URL for every claim.
- **Person-centric, not repo-centric.** The root object is "me over a time
  window" across all repos. Group by repo for display only.
- **Zero runtime dependencies in Phase 1.** Node 22+ fetch, `parseArgs`,
  `node --test`. Add a dependency only when it removes real code.
- **Outputs are private data.** Facts and reports contain employer repo
  names, colleagues, and comment bodies. Default output is
  `~/.devorbit/`, never the repo. `.gitignore` covers the patterns.
- **Facts schema is versioned.** Add fields freely; never rename or remove
  without bumping `SCHEMA_VERSION` in `src/facts/schema.js`.
- **Never rank people.** Collaborator counts describe who you work with.
  No leaderboards, no per-person scores.

## Commands

```bash
npm test                              # node --test
node bin/devorbit.js auth             # check token and scopes
node bin/devorbit.js facts --since 7d # write ~/.devorbit/facts/<date>_7d.facts.json
node bin/devorbit.js facts --since 30d --stdout | jq .summary
DEVORBIT_DEBUG=1 node bin/devorbit.js facts   # stack traces on error
```

Auth comes from `GITHUB_TOKEN` or `gh auth token`. Only api.github.com is
contacted.

## GitHub API notes

- PRs come from GraphQL `search(type: ISSUE)` with `author:` / `reviewed-by:`
  / `commenter:` and `updated:>=` qualifiers, 25 per page because each PR
  carries nested reviews and comments. Search caps at 1000 results.
- Commits outside PRs come from REST `search/commits`, which has its own
  30/min limit and a lagging index. Its failure is a warning, not an error.
- Bots are excluded from review timing via `__typename == Bot` or a
  `[bot]` login suffix.

## Testing

Fixtures in `test/fixtures` are hand-written in the GraphQL response shape
and scrubbed of real data. Every fact function should be covered by a
fixture assertion. Keep the LLM out of the test suite.
