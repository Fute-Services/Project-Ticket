import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Security headers for `vite preview` (how the self-hosted build on
// 192.168.1.23:80 is served) — the backend already gets these via Helmet,
// but the static frontend host had none (docs/security/VULN-01). If the
// office server ends up served by something other than `vite preview`
// (e.g. IIS), these headers need to be configured at that layer instead.
const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https:",
    // No generativelanguage.googleapis.com here on purpose — the AI Cabinet
    // used to call Gemini directly from the browser, but that now goes
    // through our own backend (aiCabinetController.js) instead, so the
    // browser has no legitimate reason to reach Google directly anymore;
    // keeping that allowance would just be one more place data could leak
    // to if a future XSS ever happened.
    "connect-src 'self' http://192.168.1.23:5000",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'same-origin',
};

export default defineConfig({
  plugins: [react()],
  preview: {
    headers: securityHeaders,
  },
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
