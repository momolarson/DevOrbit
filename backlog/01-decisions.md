# Decisions

Append-only. Newest at the bottom. To reverse a decision, add a new entry that
references the old one.

## 2026-09-02: Engineer-first, never manager-first

DevOrbit shows an engineer their own work. It does not rank people against
each other and it does not produce views whose main audience is someone else
looking at the engineer. This was the original premise; recording it so it
survives feature pressure.

Test: would this feature make sense in a manager's dashboard but not in a
private notebook? Then it does not belong.

## 2026-09-02: Narrow to GitHub for the rebuild

Bitbucket, Jira, and Linear support is set aside until the GitHub version is
something people open weekly. Breadth was the main thing that kept the first
version from getting deep anywhere. The provider abstraction in
`src/services` is worth keeping in spirit, but not worth maintaining three
implementations of yet.

## 2026-09-02: The core is narrative, not dashboard

The headline output is an LLM-written retro over locally computed facts, with
evidence links. Charts and tables support the narrative; they are not the
product. See `00-vision.md` for the reasoning.

## 2026-09-02: CLI first

DevOrbit is rebuilt as a Node CLI. Auth comes from `gh auth token`, facts
are computed to JSON, the model narrates, output is markdown by default.
The existing web UI is not the product; it may return later as a viewer
over the same facts JSON. Exports are how the
retro leaves the terminal, see `ideas/export-formats.md`.

Reasoning: least code to get the retro into the user's own hands, fits the
privacy story, easy to cron, no login UI. Recorded from the user's
decision on 2026-09-02.

## 2026-09-02: No web interface, no Vite; exports are HTML and PDF only

Static HTML and PDF exports make a served web UI redundant, so the React
app, Vite, Tailwind, Chart.js, react-table, and the rest of the front-end
stack go. The rebuild is a plain Node CLI with no bundler. Google Sheets
export is dropped entirely: it was the only export that wrote to a third
party and needed an OAuth flow, and there is no concrete use waiting for
it.

This also settles the in-place versus fresh-repo question: rewrite in
place on a branch, delete the front end, keep the name and history.

## Pending

- (none)

## Superseded

- Rewrite in place vs fresh repo: settled above, rewrite in place.
