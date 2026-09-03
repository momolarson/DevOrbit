import { resolveToken } from '../github/auth.js'
import { GitHubClient } from '../github/client.js'

export async function authCommand() {
  const { token, source } = await resolveToken()
  const client = new GitHubClient(token)
  const { body } = await client.rest('/user')
  console.log(`Authenticated as ${body.login}${body.name ? ` (${body.name})` : ''}`)
  console.log(`Token source: ${source}`)
  if (client.rateLimit.rest) {
    const { remaining, limit } = client.rateLimit.rest
    console.log(`REST rate limit: ${remaining}/${limit} remaining`)
  }
  if (client.scopes) console.log(`Scopes: ${client.scopes}`)
  return 0
}
