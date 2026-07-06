import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend stays exactly as-is (Catalyst function at pos_backend). During local dev,
// requests to /api/* are proxied to it; in production this app is built to /dist and
// deployed as the Catalyst client, calling the same relative /api/* routes.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
