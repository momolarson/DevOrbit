import { authCommand } from './commands/auth.js'
import { factsCommand } from './commands/facts.js'

const COMMANDS = {
  auth: authCommand,
  facts: factsCommand,
}

const HELP = `devorbit — a personal engineering retro over your GitHub activity

Usage:
  devorbit auth                      Check GitHub authentication and scopes
  devorbit facts [--since 7d]        Compute the facts document for a time window

Options for facts:
  --since <window|date>   7d (default), 2w, 30d, 3m, or an ISO date
  --until <date>          ISO date, defaults to now
  --out <path>            Write facts JSON here (default: ~/.devorbit/facts/)
  --stdout                Print facts JSON to stdout instead of a file
  --quiet                 Skip the summary table

Auth comes from GITHUB_TOKEN or \`gh auth token\`. Nothing is sent anywhere
except api.github.com. Output files contain private repo data; keep them out
of version control.
`

export async function run(argv) {
  const [name, ...rest] = argv
  if (!name || name === '--help' || name === '-h' || name === 'help') {
    process.stdout.write(HELP)
    return 0
  }
  const command = COMMANDS[name]
  if (!command) {
    console.error(`devorbit: unknown command "${name}"\n`)
    process.stdout.write(HELP)
    return 2
  }
  return command(rest)
}
