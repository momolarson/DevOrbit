import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Resolve a GitHub token. Order: GITHUB_TOKEN env, then `gh auth token`.
 * Returns { token, source }.
 */
export async function resolveToken() {
  if (process.env.GITHUB_TOKEN) {
    return { token: process.env.GITHUB_TOKEN, source: 'GITHUB_TOKEN' }
  }
  try {
    const { stdout } = await execFileAsync('gh', ['auth', 'token'])
    const token = stdout.trim()
    if (token) return { token, source: 'gh auth token' }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('no GITHUB_TOKEN set and the gh CLI is not installed. Install gh and run `gh auth login`, or export GITHUB_TOKEN.')
    }
    throw new Error(`no GITHUB_TOKEN set and \`gh auth token\` failed: ${err.stderr?.trim() || err.message}`)
  }
  throw new Error('no GitHub token found. Run `gh auth login` or export GITHUB_TOKEN.')
}
