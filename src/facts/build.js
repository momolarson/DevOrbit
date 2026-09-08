import { SCHEMA_VERSION } from './schema.js'
import { detectAI, AI_DETECTION_RULE } from '../util/ai.js'
import { hoursBetween, median, inWindow, windowLabel } from '../util/time.js'
import { wordCount, isBot } from '../util/text.js'

/**
 * Pure transform from raw GitHub data to the facts document.
 * No network, no dates from the clock other than `generatedAt`.
 */
export function buildFacts({ viewer, since, until, authoredPRs, reviewedPRs, searchedCommits = [], warnings = [] }) {
  const me = viewer.login
  const window = { since: since.toISOString(), until: until.toISOString(), label: windowLabel(since, until) }

  const prs = authoredPRs.map((pr) => shapeAuthoredPR(pr, { me, since, until }))
  const reviewed = reviewedPRs
    .map((pr) => shapeReviewedPR(pr, { me, since, until }))
    .filter((r) => r.myReviews.length > 0 || r.myComments.length > 0)

  const received = prs.flatMap((pr) => pr._othersComments)
  const given = reviewed.flatMap((r) => r.myComments)
  for (const pr of prs) delete pr._othersComments

  const commits = mergeCommits({ prs, searchedCommits, me, since, until })

  const collaborators = { reviewedMe: {}, iReviewed: {} }
  for (const pr of prs) for (const login of pr.reviewers) bump(collaborators.reviewedMe, login)
  for (const r of reviewed) bump(collaborators.iReviewed, r.author)

  const opened = prs.filter((p) => inWindow(p.createdAt, since, until))
  const merged = prs.filter((p) => inWindow(p.mergedAt, since, until))
  const aiCommits = commits.filter((c) => c.ai.assisted)

  const summary = {
    prsOpened: opened.length,
    prsMerged: merged.length,
    prsStillOpen: prs.filter((p) => p.state === 'OPEN').length,
    prsReviewed: reviewed.length,
    commentsGiven: given.length,
    commentsReceived: received.length,
    commitsAuthored: commits.length,
    aiAssistedCommits: aiCommits.length,
    aiAssistedShare: commits.length ? round(aiCommits.length / commits.length) : null,
    reposTouched: unique([...prs.map((p) => p.repo), ...reviewed.map((r) => r.repo), ...commits.map((c) => c.repo)]).length,
    medianTimeToFirstReviewHours: median(prs.map((p) => p.timeToFirstReviewHours)),
    medianTimeToMergeHours: median(merged.map((p) => p.timeToMergeHours)),
    medianPrSize: median(prs.map((p) => p.size)),
    largestPr: prs.length ? prs.reduce((a, b) => (b.size > a.size ? b : a)).url : null,
    prsWithoutFirstReview: prs.filter((p) => p.state === 'OPEN' && p.timeToFirstReviewHours == null && !p.isDraft).length,
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    window,
    user: { login: me, name: viewer.name ?? null },
    summary,
    prs: prs.sort(byDateDesc('updatedAt')),
    reviewed: reviewed.sort(byDateDesc('updatedAt')),
    comments: { given: given.sort(byDateDesc('createdAt')), received: received.sort(byDateDesc('createdAt')) },
    commits: commits.sort(byDateDesc('committedDate')),
    collaborators,
    detection: { aiRule: AI_DETECTION_RULE },
    warnings,
  }
}

function shapeAuthoredPR(pr, { me, since, until }) {
  const reviews = pr.reviews.nodes.filter((r) => r.author?.login !== me && !isBot(r.author))
  const issueComments = pr.comments.nodes.filter((c) => c.author?.login !== me && !isBot(c.author))
  const reviewComments = reviews.flatMap((r) => r.comments.nodes.filter((c) => c.author?.login !== me && !isBot(c.author)))

  const firstReviewAt = earliest([
    ...reviews.map((r) => r.submittedAt),
    ...issueComments.map((c) => c.createdAt),
    ...reviewComments.map((c) => c.createdAt),
  ])

  const commits = pr.commits.nodes.map((n) => n.commit)
  const commitsAfterFirstReview = firstReviewAt
    ? commits.filter((c) => new Date(c.committedDate) > new Date(firstReviewAt)).length
    : 0

  const bodyAI = detectAI(pr.body)
  const commitAI = commits.map((c) => detectAI(c.message)).find((d) => d.assisted)
  const ai = bodyAI.assisted ? bodyAI : (commitAI ?? bodyAI)

  const othersComments = [...issueComments, ...reviewComments]
    .filter((c) => inWindow(c.createdAt, since, until))
    .map((c) => shapeComment(c, pr))

  return {
    repo: pr.repository.nameWithOwner,
    private: pr.repository.isPrivate,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    state: pr.state,
    isDraft: pr.isDraft,
    createdAt: pr.createdAt,
    mergedAt: pr.mergedAt,
    closedAt: pr.closedAt,
    updatedAt: pr.updatedAt,
    additions: pr.additions,
    deletions: pr.deletions,
    size: pr.additions + pr.deletions,
    changedFiles: pr.changedFiles,
    commitCount: pr.commits.totalCount,
    descriptionWords: wordCount(pr.body),
    hasLinkedIssue: pr.closingIssuesReferences.totalCount > 0,
    firstReviewAt,
    timeToFirstReviewHours: hoursBetween(pr.createdAt, firstReviewAt),
    timeToMergeHours: hoursBetween(pr.createdAt, pr.mergedAt),
    reviewRounds: reviews.filter((r) => r.state === 'CHANGES_REQUESTED').length,
    commitsAfterFirstReview,
    reviewers: unique(reviews.map((r) => r.author.login)),
    approvals: reviews.filter((r) => r.state === 'APPROVED').length,
    commentsReceived: issueComments.length + reviewComments.length,
    ai,
    _othersComments: othersComments,
    _commits: commits,
  }
}

function shapeReviewedPR(pr, { me, since, until }) {
  const myReviews = pr.reviews.nodes
    .filter((r) => r.author?.login === me && inWindow(r.submittedAt, since, until))
    .map((r) => ({ state: r.state, submittedAt: r.submittedAt, url: r.url, comments: r.comments.nodes.length }))

  const myReviewComments = pr.reviews.nodes
    .filter((r) => r.author?.login === me)
    .flatMap((r) => r.comments.nodes)
    .filter((c) => c.author?.login === me && inWindow(c.createdAt, since, until))
  const myIssueComments = pr.comments.nodes.filter((c) => c.author?.login === me && inWindow(c.createdAt, since, until))
  const myComments = [...myReviewComments, ...myIssueComments].map((c) => shapeComment(c, pr))

  const firstReviewByMe = earliest(myReviews.map((r) => r.submittedAt).concat(myComments.map((c) => c.createdAt)))

  return {
    repo: pr.repository.nameWithOwner,
    private: pr.repository.isPrivate,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    author: pr.author?.login ?? null,
    state: pr.state,
    createdAt: pr.createdAt,
    mergedAt: pr.mergedAt,
    updatedAt: pr.updatedAt,
    size: pr.additions + pr.deletions,
    changedFiles: pr.changedFiles,
    myFirstResponseHours: hoursBetween(pr.createdAt, firstReviewByMe),
    myReviews,
    myComments,
    ai: detectAI(pr.body),
  }
}

function shapeComment(c, pr) {
  return {
    url: c.url,
    prUrl: pr.url,
    repo: pr.repository.nameWithOwner,
    author: c.author?.login ?? null,
    createdAt: c.createdAt,
    words: wordCount(c.body),
    body: c.body,
  }
}

function mergeCommits({ prs, searchedCommits, me, since, until }) {
  const bySha = new Map()
  for (const pr of prs) {
    for (const c of pr._commits) {
      const authorLogin = c.author?.user?.login
      if (authorLogin && authorLogin !== me) continue
      if (!inWindow(c.committedDate, since, until)) continue
      bySha.set(c.oid, {
        sha: c.oid,
        repo: pr.repo,
        url: c.url,
        headline: c.messageHeadline,
        committedDate: c.committedDate,
        prUrl: pr.url,
        ai: detectAI(c.message),
      })
    }
    delete pr._commits
  }
  for (const c of searchedCommits) {
    if (bySha.has(c.sha)) continue
    if (!inWindow(c.committedDate, since, until)) continue
    bySha.set(c.sha, {
      sha: c.sha,
      repo: c.repo,
      url: c.url,
      headline: c.message.split('\n')[0],
      committedDate: c.committedDate,
      prUrl: null,
      ai: detectAI(c.message),
    })
  }
  return [...bySha.values()]
}

function earliest(isoList) {
  const xs = isoList.filter(Boolean).map((s) => new Date(s).getTime())
  return xs.length ? new Date(Math.min(...xs)).toISOString() : null
}
function unique(xs) {
  return [...new Set(xs.filter(Boolean))]
}
function bump(obj, key) {
  if (key) obj[key] = (obj[key] ?? 0) + 1
}
function round(x) {
  return Math.round(x * 100) / 100
}
function byDateDesc(field) {
  return (a, b) => new Date(b[field] ?? 0) - new Date(a[field] ?? 0)
}
