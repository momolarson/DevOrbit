import { SEARCH_PRS, VIEWER } from './queries.js'

function day(d) {
  return new Date(d).toISOString().slice(0, 10)
}

export async function fetchViewer(client) {
  const data = await client.graphql(VIEWER)
  return data.viewer
}

/** PRs I authored that were touched in the window. */
export async function fetchAuthoredPRs(client, { login, since }) {
  const q = `is:pr author:${login} updated:>=${day(since)} sort:updated-desc`
  const out = []
  for await (const pr of client.searchAll(SEARCH_PRS, { q })) out.push(pr)
  return out
}

/** PRs by others that I reviewed or commented on, touched in the window. */
export async function fetchReviewedPRs(client, { login, since }) {
  const q = `is:pr -author:${login} reviewed-by:${login} updated:>=${day(since)} sort:updated-desc`
  const out = []
  for await (const pr of client.searchAll(SEARCH_PRS, { q })) out.push(pr)
  const seen = new Set(out.map((p) => p.url))
  const q2 = `is:pr -author:${login} commenter:${login} updated:>=${day(since)} sort:updated-desc`
  for await (const pr of client.searchAll(SEARCH_PRS, { q: q2 })) {
    if (!seen.has(pr.url)) out.push(pr)
  }
  return out
}

/**
 * Commits I authored in the window, across all repos, via the commit
 * search API. Catches direct pushes that never went through a PR.
 * The search index can lag; PR commits are merged in later by sha.
 */
export async function fetchAuthoredCommits(client, { login, since, until }) {
  const q = `author:${login} committer-date:${day(since)}..${day(until)}`
  const out = []
  try {
    for await (const item of client.restAll('/search/commits', {
      params: { q, per_page: 100, sort: 'committer-date', order: 'desc' },
      pick: (b) => b.items,
    })) {
      out.push({
        sha: item.sha,
        url: item.html_url,
        repo: item.repository.full_name,
        message: item.commit.message,
        committedDate: item.commit.committer.date,
      })
    }
  } catch (err) {
    // Commit search is the least reliable endpoint; do not fail the whole run.
    return { commits: out, warning: `commit search failed: ${err.message}` }
  }
  return { commits: out, warning: null }
}
