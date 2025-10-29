import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Build: 2025-10-29 - Landing Page V2 Deployment
export default defineConfig({
  plugins: [
    react(),
  ],
  base: './', // Use relative paths for Electron
  server: {
    host: '0.0.0.0', // Expose to network
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
});
