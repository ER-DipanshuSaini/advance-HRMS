import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
    },
    host: true,
    strictPort: true,
    port: 5173,
    proxy: {
      '/api/v1': process.env.API_PROXY_TARGET || 'http://localhost:8000',
      '/media': process.env.API_PROXY_TARGET || 'http://localhost:8000',
    },
  }
})
