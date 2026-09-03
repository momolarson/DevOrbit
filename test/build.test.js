import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildFacts } from '../src/facts/build.js'
import { SCHEMA_VERSION } from '../src/facts/schema.js'

const load = async (name) => JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))

const viewer = { login: 'momo', name: 'Momo' }
const since = new Date('2026-08-24T00:00:00Z')
const until = new Date('2026-08-31T00:00:00Z')

test('authored PR facts: timings, rounds, reviewers, AI detection', async () => {
  const facts = buildFacts({ viewer, since, until, authoredPRs: [await load('pr-authored.json')], reviewedPRs: [] })
  assert.equal(facts.schemaVersion, SCHEMA_VERSION)
  assert.equal(facts.prs.length, 1)
  const pr = facts.prs[0]
  assert.equal(pr.size, 150)
  assert.equal(pr.hasLinkedIssue, true)
  // Bot review at 10:05 is ignored; first human review is dana at 12:00 next day = 26h
  assert.equal(pr.firstReviewAt, '2026-08-26T12:00:00.000Z')
  assert.equal(pr.timeToFirstReviewHours, 26)
  assert.equal(pr.timeToMergeHours, 53)
  assert.equal(pr.reviewRounds, 1)
  assert.equal(pr.approvals, 1)
  assert.deepEqual(pr.reviewers, ['dana'])
  assert.equal(pr.commitsAfterFirstReview, 1)
  assert.equal(pr.commentsReceived, 1)
  assert.equal(pr.ai.assisted, true)
  assert.equal(pr.ai.tool, 'claude')
  assert.equal(facts.summary.prsMerged, 1)
  assert.equal(facts.summary.prsOpened, 1)
  assert.equal(facts.summary.commitsAuthored, 2)
  assert.equal(facts.summary.aiAssistedCommits, 1)
  assert.equal(facts.summary.aiAssistedShare, 0.5)
  assert.deepEqual(facts.collaborators.reviewedMe, { dana: 1 })
  assert.equal(facts.comments.received.length, 1)
  assert.equal(facts.comments.received[0].author, 'dana')
})

test('reviewed PR facts: my reviews and comments only, in window', async () => {
  const facts = buildFacts({ viewer, since, until, authoredPRs: [], reviewedPRs: [await load('pr-reviewed.json')] })
  assert.equal(facts.reviewed.length, 1)
  const r = facts.reviewed[0]
  assert.equal(r.author, 'dana')
  assert.equal(r.myReviews.length, 1)
  assert.equal(r.myComments.length, 2)
  assert.equal(r.myFirstResponseHours, 12)
  assert.equal(facts.summary.commentsGiven, 2)
  assert.deepEqual(facts.collaborators.iReviewed, { dana: 1 })
})

test('reviewed PRs with no activity by me in the window are dropped', async () => {
  const pr = await load('pr-reviewed.json')
  const facts = buildFacts({ viewer, since: new Date('2026-09-01T00:00:00Z'), until: new Date('2026-09-08T00:00:00Z'), authoredPRs: [], reviewedPRs: [pr] })
  assert.equal(facts.reviewed.length, 0)
})

test('searched commits merge by sha and respect the window', async () => {
  const pr = await load('pr-authored.json')
  const searched = [
    { sha: 'aaa111', url: 'x', repo: 'acme/api', message: 'Add retry', committedDate: '2026-08-25T09:00:00Z' },
    { sha: 'ccc333', url: 'https://github.com/acme/infra/commit/ccc333', repo: 'acme/infra', message: 'Bump node\n\nClaude-Session: https://example', committedDate: '2026-08-29T09:00:00Z' },
    { sha: 'ddd444', url: 'y', repo: 'acme/infra', message: 'old', committedDate: '2026-08-01T09:00:00Z' },
  ]
  const facts = buildFacts({ viewer, since, until, authoredPRs: [pr], reviewedPRs: [], searchedCommits: searched })
  assert.equal(facts.commits.length, 3)
  const direct = facts.commits.find((c) => c.sha === 'ccc333')
  assert.equal(direct.prUrl, null)
  assert.equal(direct.ai.tool, 'claude')
  assert.equal(facts.summary.reposTouched, 2)
})
