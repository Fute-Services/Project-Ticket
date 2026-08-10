import { test, expect } from '@playwright/test';
import { ROLES, PASSWORD, loginAs, collectErrors, signOut } from './helpers';

test.describe('authentication', () => {
  test('rejects invalid credentials without creating a session', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill('nobody@futeservices.com');
    await page.getByLabel('PASSWORD', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page.getByRole('alert')).toContainText(/do not match/i);
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => localStorage.getItem('fute_token'))).toBeNull();
  });

  test('signs in with valid credentials and routes by role', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill(ROLES.employee.email);
    await page.getByLabel('PASSWORD', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/employee\/dashboard/);
  });

  test('password visibility toggle switches the input type', async ({ page }) => {
    await page.goto('/');
    const pw = page.getByLabel('PASSWORD', { exact: true });
    await pw.fill('secret123');
    await expect(pw).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(pw).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(pw).toHaveAttribute('type', 'password');
  });

  test('remember me unchecked keeps the session out of localStorage', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill(ROLES.employee.email);
    await page.getByLabel('PASSWORD', { exact: true }).fill(PASSWORD);
    await page.getByRole('checkbox', { name: /remember me/i }).uncheck();
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/employee\/dashboard/);

    const stores = await page.evaluate(() => ({
      local: localStorage.getItem('fute_token'),
      session: sessionStorage.getItem('fute_token'),
    }));
    expect(stores.local).toBeNull();
    expect(stores.session).not.toBeNull();
  });

  test('session survives a reload', async ({ page }) => {
    await loginAs(page, 'hr');
    await page.reload();
    await expect(page).toHaveURL(/\/hr\/overview/);
  });

  for (const role of Object.keys(ROLES)) {
    test(`${role} can sign out, which clears the session and blocks the protected route`, async ({ page }) => {
      await loginAs(page, role);
      await signOut(page);

      await expect(page).toHaveURL(/\/$/);
      const cleared = await page.evaluate(
        () => !localStorage.getItem('fute_token') && !sessionStorage.getItem('fute_token')
      );
      expect(cleared).toBe(true);

      await page.goto(ROLES[role].home);
      await expect(page).toHaveURL(/\/$/);
    });
  }
});

test.describe('route protection', () => {
  for (const [role, { home }] of Object.entries(ROLES)) {
    test(`anonymous visitor is redirected away from ${home}`, async ({ page }) => {
      await page.goto(home);
      await expect(page).toHaveURL(/\/$/);
    });
  }

  test('a signed-in employee cannot reach another role\'s dashboard', async ({ page }) => {
    await loginAs(page, 'employee');
    for (const path of ['/founder/dashboard', '/hr/overview', '/it/dashboard', '/coordinator/overview']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/employee\/dashboard/);
    }
  });

  test('unknown routes fall back to the login page', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/this/route/does/not/exist');
    await expect(page).toHaveURL(/\/$/);
    expect(errors).toEqual([]);
  });

  test('legacy /hr/dashboard redirects to the HR overview', async ({ page }) => {
    await loginAs(page, 'hr');
    await page.goto('/hr/dashboard');
    await expect(page).toHaveURL(/\/hr\/overview/);
  });
});
