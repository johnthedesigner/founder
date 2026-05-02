import { execSync } from 'child_process'

export default function setup() {
  const dbUrl =
    process.env.TEST_DATABASE_URL ?? 'postgresql://johnlivornese@localhost/ds_gen_test'
  execSync('npm run migrate:up', {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: dbUrl },
  })
}
