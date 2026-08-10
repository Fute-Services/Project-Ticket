import { test, expect } from '@playwright/test';
import { loginAs, collectErrors } from './helpers';

const PAGES = {
  founder: ['/founder/dashboard'],
  hr: ['/hr/overview', '/hr/candidates', '/hr/interviews', '/hr/attendance', '/hr/email', '/hr/directory', '/hr/reports'],
  it: ['/it/dashboard'],
  coordinator: ['/coordinator/overview', '/coordinator/tasks', '/coordinator/projects', '/coordinator/projects/PRJ-01'],
  employee: ['/employee/dashboard'],
};

for (const [role, routes] of Object.entries(PAGES)) {
  for (const route of routes) {
    test(`${route} renders content without runtime errors`, async ({ page }) => {
      const errors = collectErrors(page);
      await loginAs(page, role);
      await page.goto(route);

      // A crashed React tree unmounts everything and leaves #root empty, which
      // is exactly how the StatCard regression showed up.
      await expect(page.locator('#root')).not.toBeEmpty();
      const text = await page.locator('body').innerText();
      expect(text.trim().length).toBeGreaterThan(50);

      const broken = await page.evaluate(() =>
        [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src)
      );
      expect(broken, 'broken images').toEqual([]);
      expect(errors, `runtime errors on ${route}`).toEqual([]);
    });
  }
}

test('HR sidebar navigates to every section', async ({ page, viewport }) => {
  test.skip(!!viewport && viewport.width < 1024, 'the sidebar is an off-canvas drawer below lg');
  const errors = collectErrors(page);
  await loginAs(page, 'hr');
  // The sidebar labels are upper-cased in CSS; the accessible name is the
  // source text ("Directory", not "DIRECTORY").
  for (const [label, url] of [
    ['Directory', /\/hr\/directory/],
    ['Candidates', /\/hr\/candidates/],
    ['Interviews', /\/hr\/interviews/],
    ['Attendance', /\/hr\/attendance/],
    ['Email', /\/hr\/email/],
    ['Reports', /\/hr\/reports/],
    ['Dashboard', /\/hr\/overview/],
  ]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(page.locator('#root')).not.toBeEmpty();
  }
  expect(errors).toEqual([]);
});

test('coordinator sidebar navigates to every section', async ({ page, viewport }) => {
  test.skip(!!viewport && viewport.width < 1024, 'the sidebar is an off-canvas drawer below lg');
  await loginAs(page, 'coordinator');
  for (const [label, url] of [
    ['Projects', /\/coordinator\/projects/],
    ['Tasks', /\/coordinator\/tasks/],
    ['Dashboard', /\/coordinator\/overview/],
  ]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(url);
  }
});

test('a missing project shows a not-found state with a way back', async ({ page }) => {
  await loginAs(page, 'coordinator');
  await page.goto('/coordinator/projects/NOPE-999');
  await expect(page.getByText(/project not found/i)).toBeVisible();
  await page.getByRole('button', { name: /back to projects/i }).click();
  await expect(page).toHaveURL(/\/coordinator\/projects$/);
});

test('external project links are absolute and open in a new tab', async ({ page }) => {
  await loginAs(page, 'coordinator');
  await page.goto('/coordinator/overview');
  const links = page.locator('a[href]');
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute('href');
    if (href?.startsWith('/') || href?.startsWith('#')) continue;
    expect(href, 'external links must carry a protocol').toMatch(/^https?:\/\//);
    await expect(links.nth(i)).toHaveAttribute('target', '_blank');
    await expect(links.nth(i)).toHaveAttribute('rel', /noopener/);
  }
});

test('there is no light mode — dark is always on and there is no toggle', async ({ page }) => {
  await loginAs(page, 'hr');
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await expect(page.getByRole('button', { name: /switch to (dark|light) theme/i })).toHaveCount(0);

  await page.reload();
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
});
