import { expect } from '@playwright/test';

/**
 * Real Firebase accounts in the `fute-portal` project. Only founder, it, and
 * employee currently have known credentials (password `Test@1234`) — hr,
 * coordinator, and production need real accounts created via the founder's
 * Role Permissions page before those specs will pass.
 */
export const ROLES = {
  founder: { email: 'founder.test@futeservices.com', password: 'Test@1234', home: '/founder/dashboard' },
  hr: { email: 'hr.test@futeservices.com', password: 'Test@1234', home: '/hr/overview' },
  it: { email: 'system.it.test@futeservices.com', password: 'Test@1234', home: '/it/dashboard' },
  coordinator: { email: 'coordinator.test@futeservices.com', password: 'Test@1234', home: '/coordinator/overview' },
  employee: { email: 'test.employee@futeservices.com', password: 'Test@1234', home: '/employee/dashboard' },
  production: { email: 'production.test@futeservices.com', password: 'Test@1234', home: '/department/production' },
};

export const PASSWORD = 'Test@1234';

/** Sign in through the real login form and land on the role's home route. */
export async function loginAs(page, role) {
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
