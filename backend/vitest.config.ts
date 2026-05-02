import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@ds-gen/types': resolve(__dirname, '../packages/types/src/index.ts'),
    },
  },
  test: {
    include: ['**/*.test.ts'],
    globalSetup: ['./tests/globalSetup.ts'],
    fileParallelism: false,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
    },
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? 'postgresql://johnlivornese@localhost/ds_gen_test',
      JWT_SECRET: 'test-jwt-secret-must-be-at-least-32-chars-long',
      JWT_EXPIRES_IN: '7d',
    },
  },
})
