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
});
