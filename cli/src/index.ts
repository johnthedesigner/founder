#!/usr/bin/env node

import { runInit } from './commands/init'
import { runSync } from './commands/sync'

const [, , command, ...args] = process.argv

async function main(): Promise<void> {
  switch (command) {
    case 'init':
      await runInit(args)
      break
    case 'sync':
      await runSync(args)
      break
    default:
      console.log(`Usage: ds-gen <command>

Commands:
  init --project=<id>   Initialize design system files in the current directory
  sync                  Re-fetch and overwrite files using saved project metadata

Options:
  --token=<token>       CLI auth token (overrides config file and env)
  --api-url=<url>       API base URL (default: https://ds-gen.com)

Environment variables:
  DS_GEN_TOKEN          CLI auth token
  DS_GEN_API_URL        API base URL
`)
      if (command !== undefined) process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
