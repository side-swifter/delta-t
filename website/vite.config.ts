import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  // three.js is most of the bundle; one chunk is fine for a single page.
  build: { chunkSizeWarningLimit: 900 },
})
