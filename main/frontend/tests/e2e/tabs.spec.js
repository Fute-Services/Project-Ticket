import { test, expect } from '@playwright/test';
import { loginAs, collectErrors, signOut } from './helpers';

/**
 * The IT desk, employee portal and founder dashboard are each a single route
 * with many tabbed views. A route-level smoke test only ever sees the first
 * one, so every other view goes unexercised unless it's clicked.
 */

test.describe('IT service desk tabs', () => {
  const TABS = ['Tickets Queue', 'Approval Center', 'Data Requests', 'Asset Management', 'Reports & Logs', 'Dashboard'];

  test('every tab renders content without runtime errors', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 1024, 'the sidebar rail is desktop-only');
    const errors = collectErrors(page);
    await loginAs(page, 'it');

    for (const tab of TABS) {
      await page.getByRole('button', { name: new RegExp(`^${tab}`, 'i') }).first().click();
      const main = page.locator('main');
      await expect(main).not.toBeEmpty();
      expect((await main.innerText()).trim().length, `${tab} rendered almost nothing`).toBeGreaterThan(40);
    }
    expect(errors).toEqual([]);
  });

  test('the ticket queue status filters narrow the list', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 1024, 'the sidebar rail is desktop-only');
    await loginAs(page, 'it');
    await page.getByRole('button', { name: /^Tickets Queue/i }).first().click();

    const counter = page.getByText(/\d+ total tickets/);
    const total = Number((await counter.innerText()).match(/(\d+)/)[1]);
    expect(total).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Resolved', exact: true }).click();
    await expect(page.locator('main')).not.toBeEmpty();
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(counter).toContainText(String(total));
  });
});

test.describe('employee tabs', () => {
  const TABS = ['My Tickets', 'My Tasks', 'Dashboard'];

  test('every tab renders, including its empty state', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 1024, 'the sidebar rail is desktop-only');
    const errors = collectErrors(page);
    await loginAs(page, 'employee');

    for (const tab of TABS) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      await expect(page.locator('main')).not.toBeEmpty();
    }

    await page.getByRole('button', { name: 'My Tickets', exact: true }).click();
    await expect(page.getByText(/haven't raised any tickets yet/i)).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('founder department views', () => {
  // Visible sidebar labels (the SIDEBAR_ORDER shortLabels in
  // FounderDashboardPage.jsx), not the old floating dock's full aria-labels.
  const DEPARTMENTS = [
    'Overview',
    'Approvals',
    'Projects',
    'Reports',
    'HR',
    'IT',
    'Sales',
    'Developers',
    'Marketing',
    'Branding',
    'Production',
  ];

  test('every department view renders without runtime errors', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 1024, 'the sidebar is an off-canvas drawer below lg');
    const errors = collectErrors(page);
    await loginAs(page, 'founder');

    for (const dept of DEPARTMENTS) {
      await page.locator('aside nav button', { hasText: new RegExp(`^${dept}$`) }).click();
      const main = page.locator('main');
      await expect(main).not.toBeEmpty();
      expect((await main.innerText()).trim().length, `${dept} rendered almost nothing`).toBeGreaterThan(100);
    }
    expect(errors).toEqual([]);
  });

  test('the founder sidebar exposes a working sign out', async ({ page }) => {
    await loginAs(page, 'founder');
    await signOut(page);
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => localStorage.getItem('fute_token'))).toBeNull();
  });
});
