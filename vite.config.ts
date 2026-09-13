import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Mirrors api/candyshop/[...path].js for local dev — vite dev server has no
      // serverless functions, so we proxy directly here instead.
      '/api/candyshop': {
        target: 'https://swap.cookiescan.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/candyshop/, '/api'),
      },
    },
  },
  define: {
    // Solana web3.js expects Buffer/global to exist in the browser
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
})