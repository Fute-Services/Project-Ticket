import { expect, test } from '@playwright/test';

// Real account credentials never live in a tracked file — this used to hard-code
// 6 real futeservices.com emails and a shared plaintext password, which stayed
// in the project's git history forever even after being "removed". Each var
// below must be supplied via `main/frontend/.env.test` (gitignored, see
// .env.test.example for the required names) or the shell environment; a spec
// for a role with no credentials configured is skipped, not run against a
// blank/fake password.
function envRole(prefix, home) {
  const email = process.env[`E2E_${prefix}_EMAIL`];
  const password = process.env[`E2E_${prefix}_PASSWORD`];
  return { email, password, home, configured: Boolean(email && password) };
}

export const ROLES = {
  founder: envRole('FOUNDER', '/founder/dashboard'),
  hr: envRole('HR', '/hr/overview'),
  it: envRole('IT', '/it/dashboard'),
  coordinator: envRole('COORDINATOR', '/coordinator/overview'),
  employee: envRole('EMPLOYEE', '/employee/dashboard'),
  production: envRole('PRODUCTION', '/department/production'),
};

export const PASSWORD = ROLES.employee.password;

/** Skips the current test if `role` has no E2E_<ROLE>_EMAIL/PASSWORD configured. */
export function requireRole(role) {
  test.skip(!ROLES[role].configured, `Set E2E_${role.toUpperCase()}_EMAIL/PASSWORD (see .env.test.example) to run specs for '${role}'`);
}

/** Sign in through the real login form and land on the role's home route. */
export async function loginAs(page, role) {
  requireRole(role);
  const { email, password, home } = ROLES[role];
  await page.goto('/');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel('PASSWORD', { exact: true }).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(new RegExp(home));
}

/** Collects uncaught exceptions and console errors. */
export function collectErrors(page) {
  const errors = [];
  const ignore = /Future Flag|ERR_CONNECTION_REFUSED|Failed to load resource/;
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !ignore.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/**
 * Opens the profile menu and signs out. On phones the HR and coordinator
 * sidebars are off-canvas drawers, so the hamburger has to come first.
 */
export async function signOut(page) {
  const burger = page.getByRole('button', { name: /open navigation menu/i });
  if (await burger.isVisible().catch(() => false)) await burger.click();

  await page.getByRole('button', { name: /sign out/i }).first().click();
}
