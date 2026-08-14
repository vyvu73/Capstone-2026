import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The page is served on 3000; requests to /api are forwarded to the Express
// server on 4000, so the browser only ever talks to one origin.
export default defineConfig({
  base:'/typespeed/',
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
