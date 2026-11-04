import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Same-origin dev proxy lets your browser use HttpOnly, SameSite=Lax cookies
// without exposing the session token to JavaScript.
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ["authlab-o8wi.onrender.com"],
  },
  server: {
    host: 'localhost',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
});
