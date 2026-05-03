import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/preview/',
  resolve: {
    alias: {
      '@ds-gen/types': path.resolve(__dirname, '../packages/types/src/index.ts'),
      '@pipeline': path.resolve(__dirname, '../backend/src/pipeline'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5180,
    strictPort: true,
  },
})
