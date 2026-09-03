const API = 'https://api.github.com'
const USER_AGENT = 'devorbit-cli'

/**
 * Minimal GitHub client: GraphQL plus REST with full pagination.
 * Tracks the last seen rate limit so commands can report it.
 */
export class GitHubClient {
  constructor(token, { fetchImpl = globalThis.fetch } = {}) {
    this.token = token
    this.fetch = fetchImpl
    this.rateLimit = { rest: null, graphql: null }
    this.scopes = null
    this.requests = 0
  }

  headers(extra = {}) {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': USER_AGENT,
      'X-GitHub-Api-Version': '2022-11-28',
      ...extra,
    }
  }

  async graphql(query, variables = {}) {
    this.requests += 1
    const res = await this.fetch(`${API}/graphql`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) throw await httpError(res, 'graphql')
    const body = await res.json()
    if (body.errors?.length) {
      const msg = body.errors.map((e) => e.message).join('; ')
      throw new Error(`GraphQL error: ${msg}`)
    }
    if (body.data?.rateLimit) this.rateLimit.graphql = body.data.rateLimit
    return body.data
  }

  /** Iterate a GraphQL search connection through all pages. */
  async *searchAll(query, variables) {
    let after = null
    do {
      const data = await this.graphql(query, { ...variables, after })
      const page = data.search
      for (const node of page.nodes) if (node) yield node
      after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
    } while (after)
  }

  async rest(path, { params = {}, headers = {} } = {}) {
    const url = new URL(path.startsWith('http') ? path : `${API}${path}`)
    for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, String(v))
    this.requests += 1
    const res = await this.fetch(url, { headers: this.headers(headers) })
    const scopes = res.headers.get('x-oauth-scopes')
    if (scopes != null) this.scopes = scopes
    const remaining = res.headers.get('x-ratelimit-remaining')
    if (remaining != null) {
      this.rateLimit.rest = {
        remaining: Number(remaining),
        limit: Number(res.headers.get('x-ratelimit-limit')),
        resetAt: new Date(Number(res.headers.get('x-ratelimit-reset')) * 1000).toISOString(),
        resource: res.headers.get('x-ratelimit-resource'),
      }
    }
    if (!res.ok) throw await httpError(res, path)
    return { body: await res.json(), link: res.headers.get('link') }
  }

  /** Follow Link: rel="next" headers. `pick` selects the array from each page body. */
  async *restAll(path, { params = {}, pick = (b) => b } = {}) {
    let next = path
    let first = true
    while (next) {
      const { body, link } = await this.rest(next, { params: first ? params : {} })
      first = false
      for (const item of pick(body)) yield item
      next = parseNext(link)
    }
  }
}

function parseNext(link) {
  if (!link) return null
  const m = link.match(/<([^>]+)>;\s*rel="next"/)
  return m ? m[1] : null
}

async function httpError(res, what) {
  let detail = ''
  try {
    const body = await res.json()
    detail = body.message ? `: ${body.message}` : ''
  } catch {
    /* ignore */
  }
  if (res.status === 401) return new Error(`GitHub rejected the token (401)${detail}`)
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
    const reset = new Date(Number(res.headers.get('x-ratelimit-reset')) * 1000)
    return new Error(`GitHub rate limit exhausted; resets at ${reset.toISOString()}`)
  }
  return new Error(`GitHub ${what} failed (${res.status})${detail}`)
}
