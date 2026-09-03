// Detect AI-assisted work from commit trailers and PR bodies.
// Report the rule alongside the numbers; this is heuristic.

const TOOLS = [
  ['claude', /\bclaude\b/i],
  ['copilot', /\bcopilot\b/i],
  ['cursor', /\bcursor\b/i],
  ['codex', /\bcodex\b/i],
  ['gemini', /\bgemini\b/i],
  ['devin', /\bdevin\b/i],
  ['aider', /\baider\b/i],
  ['windsurf', /\bwindsurf\b/i],
  ['chatgpt', /\bchatgpt\b|\bopenai\b/i],
  ['amp', /\bamp\b/i],
]

const TRAILER = /^(co-authored-by|generated-by|assisted-by|claude-session|ai-agent):\s*(.+)$/gim
const BODY_MARKERS = [
  /generated with \[?claude code/i,
  /🤖 generated with/i,
  /co-authored-by:.*\b(claude|copilot|cursor|codex|gemini|devin|aider)\b/i,
]

/** Returns { assisted: boolean, tool: string|null, evidence: string|null } */
export function detectAI(text) {
  if (!text) return { assisted: false, tool: null, evidence: null }
  for (const m of text.matchAll(TRAILER)) {
    const [line, key, value] = m
    if (key.toLowerCase() === 'claude-session') return { assisted: true, tool: 'claude', evidence: line.trim() }
    for (const [tool, re] of TOOLS) {
      if (re.test(value)) return { assisted: true, tool, evidence: line.trim() }
    }
  }
  for (const re of BODY_MARKERS) {
    const m = re.exec(text)
    if (m) {
      const tool = TOOLS.find(([, r]) => r.test(m[0]))?.[0] ?? 'unknown'
      return { assisted: true, tool, evidence: m[0].trim() }
    }
  }
  return { assisted: false, tool: null, evidence: null }
}

export const AI_DETECTION_RULE =
  'A commit or PR is AI-assisted if it carries a Co-Authored-By, Generated-By, Assisted-By, or Claude-Session trailer naming a known coding agent, or a "Generated with Claude Code" marker.'
