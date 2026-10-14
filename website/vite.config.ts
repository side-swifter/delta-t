import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    // three.js is most of the home page bundle; one chunk is fine.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), team: resolve(__dirname, 'team.html') },
    },
  },
})
