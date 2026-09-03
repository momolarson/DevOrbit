import { parseArgs } from 'node:util'
import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { resolveToken } from '../github/auth.js'
import { GitHubClient } from '../github/client.js'
import { fetchViewer, fetchAuthoredPRs, fetchReviewedPRs, fetchAuthoredCommits } from '../github/fetch.js'
import { buildFacts } from '../facts/build.js'
import { parseSince } from '../util/time.js'

export async function factsCommand(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      since: { type: 'string', default: '7d' },
      until: { type: 'string' },
      out: { type: 'string' },
      stdout: { type: 'boolean', default: false },
      quiet: { type: 'boolean', default: false },
    },
  })

  const until = values.until ? new Date(values.until) : new Date()
  if (Number.isNaN(until.getTime())) throw new Error(`cannot parse --until "${values.until}"`)
  const since = parseSince(values.since, until)
  const log = values.stdout || values.quiet ? () => {} : (s) => console.error(s)

  const { token, source } = await resolveToken()
  const client = new GitHubClient(token)
  const viewer = await fetchViewer(client)
  log(`Fetching activity for ${viewer.login} from ${since.toISOString().slice(0, 10)} to ${until.toISOString().slice(0, 10)} (token: ${source})`)

  const warnings = []
  const authoredPRs = await fetchAuthoredPRs(client, { login: viewer.login, since })
  log(`  ${authoredPRs.length} PRs authored`)
  const reviewedPRs = await fetchReviewedPRs(client, { login: viewer.login, since })
  log(`  ${reviewedPRs.length} PRs by others with my reviews or comments`)
  const { commits: searchedCommits, warning } = await fetchAuthoredCommits(client, { login: viewer.login, since, until })
  if (warning) warnings.push(warning)
  log(`  ${searchedCommits.length} commits from search`)

  const facts = buildFacts({ viewer, since, until, authoredPRs, reviewedPRs, searchedCommits, warnings })
  const json = JSON.stringify(facts, null, 2)

  if (values.stdout) {
    process.stdout.write(json + '\n')
  } else {
    const path = values.out ?? defaultPath(facts)
    await mkdir(join(path, '..'), { recursive: true })
    await writeFile(path, json)
    log(`Wrote ${path}`)
  }

  if (!values.quiet && !values.stdout) printSummary(facts, client)
  return 0
}

function defaultPath(facts) {
  const day = facts.window.until.slice(0, 10)
  return join(homedir(), '.devorbit', 'facts', `${day}_${facts.window.label}.facts.json`)
}

function printSummary(facts, client) {
  const s = facts.summary
  const h = (x) => (x == null ? '—' : `${x}h`)
  const rows = [
    ['PRs opened / merged / still open', `${s.prsOpened} / ${s.prsMerged} / ${s.prsStillOpen}`],
    ['PRs reviewed for others', s.prsReviewed],
    ['Comments given / received', `${s.commentsGiven} / ${s.commentsReceived}`],
    ['Commits authored', `${s.commitsAuthored}${s.aiAssistedCommits ? ` (${s.aiAssistedCommits} AI-assisted)` : ''}`],
    ['Repos touched', s.reposTouched],
    ['Median time to first review', h(s.medianTimeToFirstReviewHours)],
    ['Median time to merge', h(s.medianTimeToMergeHours)],
    ['Median PR size (lines)', s.medianPrSize ?? '—'],
    ['Open PRs with no review yet', s.prsWithoutFirstReview],
  ]
  const w = Math.max(...rows.map(([k]) => k.length))
  console.error('')
  for (const [k, v] of rows) console.error(`  ${k.padEnd(w)}  ${v}`)
  console.error('')
  const gql = client.rateLimit.graphql
  const rest = client.rateLimit.rest
  console.error(
    `  ${client.requests} API requests` +
      (gql ? `, GraphQL ${gql.remaining}/${gql.limit} left` : '') +
      (rest ? `, REST ${rest.remaining}/${rest.limit} left` : ''),
  )
  for (const wmsg of facts.warnings) console.error(`  warning: ${wmsg}`)
}
