import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // shadcn/ui generates imports as `@/components/...` and `@/lib/utils`.
    // Nothing used this alias before the migration; it exists for shadcn and
    // is safe for hand-written imports too.
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Without this, Rollup's default chunking factors every dependency
        // shared across 2+ lazy routes (App.jsx's lazy() page imports) into
        // its own micro-chunk — lucide-react in particular ends up as one
        // ~0.3-0.9kB file PER ICON, so a single dashboard load can trigger
        // 40+ extra HTTP requests just for icons. Only lucide-react and core
        // react/router are special-cased here (every page needs them anyway,
        // so merging costs nothing) — everything else (recharts,
        // framer-motion, radix) is left to Rollup's default per-route
        // splitting so heavy libs stay lazy-loaded only where actually used.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react-router-dom') || id.includes('/react-dom/') || id.includes('/react/')) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
});
