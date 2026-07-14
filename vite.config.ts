import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // App cutscenes / panels split from main shell when possible
          if (id.includes('/src/components/OpeningCinematic'))
            return 'cinematic';
          if (id.includes('/src/components/SkillTreePanel')) return 'skills-ui';
          if (id.includes('/src/components/PassPanel')) return 'pass-ui';
          if (!id.includes('node_modules')) return;
          // three + r3f + postprocessing share one chunk (avoids circular splits)
          if (
            id.includes('three') ||
            id.includes('@react-three') ||
            id.includes('postprocessing')
          ) {
            return 'three';
          }
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('zustand') || id.includes('lucide')) return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
