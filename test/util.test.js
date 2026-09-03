import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSince, median, hoursBetween, windowLabel } from '../src/util/time.js'
import { detectAI } from '../src/util/ai.js'
import { wordCount, isBot } from '../src/util/text.js'

const until = new Date('2026-09-02T12:00:00Z')

test('parseSince handles relative windows and ISO dates', () => {
  assert.equal(parseSince('7d', until).toISOString(), '2026-08-26T12:00:00.000Z')
  assert.equal(parseSince('2w', until).toISOString(), '2026-08-19T12:00:00.000Z')
  assert.equal(parseSince('2026-06-01', until).toISOString(), '2026-06-01T00:00:00.000Z')
  assert.throws(() => parseSince('yesterday', until), /cannot parse/)
})

test('median ignores nulls and handles even counts', () => {
  assert.equal(median([]), null)
  assert.equal(median([null, 3]), 3)
  assert.equal(median([1, 2, 3, 4]), 2.5)
})

test('hoursBetween rounds to a tenth', () => {
  assert.equal(hoursBetween('2026-01-01T00:00:00Z', '2026-01-01T01:30:00Z'), 1.5)
  assert.equal(hoursBetween('2026-01-01T00:00:00Z', null), null)
})

test('windowLabel prefers weeks when it divides evenly', () => {
  assert.equal(windowLabel(parseSince('7d', until), until), '7d')
  assert.equal(windowLabel(parseSince('2w', until), until), '2w')
  assert.equal(windowLabel(parseSince('30d', until), until), '30d')
})

test('detectAI recognises trailers and body markers', () => {
  assert.equal(detectAI('Fix\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>').tool, 'claude')
  assert.equal(detectAI('Fix\n\nCo-authored-by: Copilot <copilot@github.com>').tool, 'copilot')
  assert.equal(detectAI('Fix\n\nClaude-Session: https://claude.ai/code/x').tool, 'claude')
  assert.equal(detectAI('Body\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)').tool, 'claude')
  assert.equal(detectAI('Fix\n\nCo-authored-by: Dana <dana@acme.com>').assisted, false)
  assert.equal(detectAI('').assisted, false)
})

test('text helpers', () => {
  assert.equal(wordCount('  two words '), 2)
  assert.equal(wordCount(null), 0)
  assert.equal(isBot({ login: 'dependabot[bot]', __typename: 'User' }), true)
  assert.equal(isBot({ login: 'x', __typename: 'Bot' }), true)
  assert.equal(isBot({ login: 'dana', __typename: 'User' }), false)
  assert.equal(isBot(null), true)
})
