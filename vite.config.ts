import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // The isolated three vendor chunk is unavoidably ~960 kB; raise the warning
    // ceiling so the build log stays clean while the main app bundle (~206 kB)
    // remains the meaningful figure to watch.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split the heavy 3D stack (three + react-three-fiber/drei) into its own
        // long-lived vendor chunk so the main app bundle shrinks and the engine
        // can be cached across deploys, cutting time-to-interactive.
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
