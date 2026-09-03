#!/usr/bin/env node
import { run } from '../src/cli.js'

run(process.argv.slice(2)).then(
  (code) => process.exit(code ?? 0),
  (err) => {
    console.error(`devorbit: ${err.message}`)
    if (process.env.DEVORBIT_DEBUG) console.error(err.stack)
    process.exit(1)
  },
)
