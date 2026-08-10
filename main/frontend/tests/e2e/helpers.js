import { expect } from '@playwright/test';

/** Demo accounts seeded by src/utils/dummyAuth.js, keyed by the quick-login tile. */
export const ROLES = {
  founder: { tile: 'Founder Portal', email: 'founder@futeservices.com', home: '/founder/dashboard' },
  hr: { tile: 'HR Department', email: 'hr.demo@futeservices.com', home: '/hr/overview' },
  it: { tile: 'IT Service Desk', email: 'system.demo@futeservices.com', home: '/it/dashboard' },
  coordinator: { tile: 'Coordinator', email: 'coordinator.demo@futeservices.com', home: '/coordinator/overview' },
  employee: { tile: 'Employee Portal', email: 'employee@futeservices.com', home: '/employee/dashboard' },
};

export const PASSWORD = 'demo1234';

/** Sign in through the quick-demo tile and land on the role's home route. */
export async function loginAs(page, role) {
  const { tile, home } = ROLES[role];
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(tile, 'i') }).first().click();
  await expect(page).toHaveURL(new RegExp(home));
}

/**
 * Collects uncaught exceptions and console errors. The Express backend is
 * optional in this app — when it's down the login call fails and the UI falls
 * back to the local demo accounts by design, so that one network error is not
 * a defect and is filtered out.
 */
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

  if (!(await page.getByRole('button', { name: /sign out/i }).count())) {
    await page.locator('button').filter({ hasText: /Demo|Founder/ }).first().click();
  }
  await page.getByRole('button', { name: /sign out/i }).first().click();
}
