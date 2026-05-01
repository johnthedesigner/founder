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
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
    },
  },
})
