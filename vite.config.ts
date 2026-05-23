import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const isGitHubPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  base: isGitHubPages ? '/memory-observatory/' : '/',
  plugins: [react()],
  build: {
    // The observatory intentionally ships a sizeable isolated WebGL vendor chunk.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](react|react-dom|zustand)[\\/]/.test(id)) return 'react'
          if (/[\\/]node_modules[\\/](three|@react-three|postprocessing)[\\/]/.test(id)) {
            return 'webgl'
          }
          if (/[\\/]node_modules[\\/](gsap|motion|lenis|howler)[\\/]/.test(id)) return 'motion'
        },
      },
    },
  },
})
