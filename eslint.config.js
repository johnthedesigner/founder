// @ts-check
const tseslint = require('typescript-eslint')

module.exports = tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: tseslint.configs.recommended,
  },
)
