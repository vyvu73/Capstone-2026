import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 3000 keeps the CLAUDE.md screenshot workflow intact:
//   node screenshot.mjs http://localhost:3000
export default defineConfig({
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
