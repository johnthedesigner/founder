import { defineConfig } from '@playwright/test'
import { resolve } from 'path'

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  use: {
    baseURL: 'http://localhost:5299',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: [
    {
      command: 'npx tsx src/server.ts',
      cwd: resolve(__dirname, '../backend'),
      url: 'http://localhost:3001/health',
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL:
          process.env.TEST_DATABASE_URL ?? 'postgresql://johnlivornese@localhost/ds_gen_test',
        JWT_SECRET: 'test-jwt-secret-must-be-at-least-32-chars-long',
        JWT_EXPIRES_IN: '7d',
        PORT: '3001',
        FRONTEND_URL: 'http://localhost:5299',
      },
    },
    {
      command: 'npm run dev -- --port 5299',
      url: 'http://localhost:5299',
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      cwd: resolve(__dirname, '../preview-sandbox'),
      url: 'http://localhost:5180',
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
