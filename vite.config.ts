import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Build: 2025-10-29 18:05 - v1.0.4 - FORCE FRESH BUILD
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
    rollupOptions: {
      output: {
        // Use consistent chunk naming to help with caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui': ['lucide-react', 'recharts']
        }
      }
    }
  },
});
