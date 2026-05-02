import 'dotenv/config'
import { runner } from 'node-pg-migrate'
import { join } from 'path'

const direction = process.argv[2]
if (direction !== 'up' && direction !== 'down') {
  console.error('Usage: tsx migrate.ts [up|down]')
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

void runner({
  databaseUrl,
  dir: join(process.cwd(), 'src/db/migrations'),
  migrationsTable: 'pgmigrations',
  direction,
  log: (msg) => console.log(msg),
}).catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
