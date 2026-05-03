import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@ds-gen/types': path.resolve(__dirname, '../packages/types/src/index.ts'),
      '@pipeline': path.resolve(__dirname, '../backend/src/pipeline'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3001',
      '/api': 'http://localhost:3001',
      '/projects': {
        target: 'http://localhost:3001',
        // Browser navigations send Accept: text/html — serve index.html so the SPA handles routing.
        // Fetch/XHR API calls don't include text/html and get proxied to the backend.
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html'
          }
        },
      },
      '/preview': {
        target: 'http://localhost:5180',
        rewrite: (path) => path.replace(/^\/preview/, ''),
      },
    },
  },
})
