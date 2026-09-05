import { defineConfig, devices } from '@playwright/test';

// Test-account credentials (E2E_<ROLE>_EMAIL/PASSWORD, see helpers.js) live in
// this gitignored file, never in a tracked one — copy .env.test.example to
// get started. Optional: CI (or a dev who already exported the vars) may not
// have the file at all, so a missing file is not an error.
//
// process.loadEnvFile needs Node >=20.6 (see package.json's "engines") — on
// an older Node it doesn't exist at all, which throws too and is caught the
// same way. Either way this fails silent rather than loud, so on old Node
// the specs for every role just quietly skip (helpers.js's requireRole)
// instead of erroring — if a spec you expected to run is skipping instead,
// check `node --version` before assuming .env.test itself is the problem.
try {
  process.loadEnvFile('.env.test');
} catch {
  // no .env.test, or Node too old to have loadEnvFile — fall through to
  // whatever's already in process.env
}

/**
 * The app runs entirely in the browser against the local demo accounts when
 * the Express backend isn't up, so the suite only needs the Vite dev server.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --port 5173 --strictPort',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
