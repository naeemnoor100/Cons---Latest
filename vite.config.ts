import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Fix for TS2580: Cannot find name 'process' in the Node environment during config execution
declare var process: any;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Explicitly shim process.env for browser compatibility
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env': '{}'
  },
  resolve: {
    // CRITICAL: This prevents the "useRef" null error by forcing 
    // all dependencies to use the same React instance.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    // Ensure clean builds to force Vercel updates
    emptyOutDir: true,
  }
});