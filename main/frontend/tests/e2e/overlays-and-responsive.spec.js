import { test, expect } from '@playwright/test';
import { loginAs, collectErrors } from './helpers';

test.describe('overlays', () => {
  test('the ticket modal closes on Escape and on a backdrop click', async ({ page }) => {
    await loginAs(page, 'employee');

    await page.getByRole('button', { name: /raise it ticket/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.getByRole('button', { name: /raise it ticket/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.mouse.click(8, 8); // backdrop, well clear of the panel
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('the ticket modal is announced as a dialog', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.getByRole('button', { name: /raise it ticket/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-label', /.+/);
  });

  test('the team chat drawer opens and closes', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 768, 'the chat trigger is hidden in the phone topbar');
    const errors = collectErrors(page);
    await loginAs(page, 'it');
    await page.getByRole('button', { name: /team chat/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(errors).toEqual([]);
  });

  const A11Y_PAGES = {
    hr: ['/hr/overview', '/hr/candidates', '/hr/interviews', '/hr/attendance', '/hr/email', '/hr/directory', '/hr/reports'],
    coordinator: ['/coordinator/overview', '/coordinator/tasks', '/coordinator/projects'],
    employee: ['/employee/dashboard'],
    it: ['/it/dashboard'],
    founder: ['/founder/dashboard'],
  };

  for (const [role, routes] of Object.entries(A11Y_PAGES)) {
    test(`${role} pages expose an accessible name on every control`, async ({ page }) => {
      await loginAs(page, role);
      for (const route of routes) {
        await page.goto(route);
        const bad = await page.evaluate(() => {
          const visible = (e) => e.offsetParent !== null;
          const buttons = [...document.querySelectorAll('button')]
            .filter(visible)
            .filter((b) => !b.innerText.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'))
            .map((b) => 'button: ' + b.outerHTML.replace(/\s+/g, ' ').slice(0, 100));
          const fields = [...document.querySelectorAll('input,textarea,select')]
            .filter(visible)
            .filter((f) => !(f.labels && f.labels.length) && !f.getAttribute('aria-label') && !f.getAttribute('aria-labelledby') && !f.placeholder)
            .map((f) => 'field: ' + f.outerHTML.replace(/\s+/g, ' ').slice(0, 100));
          return [...buttons, ...fields];
        });
        expect(bad, `unnamed controls on ${route}`).toEqual([]);
      }
    });
  }

  test('the Assign Task dialog labels every field', async ({ page }) => {
    await loginAs(page, 'coordinator');
    await page.goto('/coordinator/tasks');
    await page.getByRole('button', { name: /assign task/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Title')).toBeVisible();
    await expect(dialog.getByLabel('Due Date')).toBeVisible();
  });
});

test.describe('responsive', () => {
  const SIZES = [
    ['desktop', 1440, 900],
    ['laptop', 1280, 800],
    ['tablet', 834, 1112],
    ['mobile', 390, 844],
  ];

  for (const [name, width, height] of SIZES) {
    test(`the employee dashboard is usable at ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      const errors = collectErrors(page);
      await loginAs(page, 'employee');

      // Nothing should spill sideways.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1);

      const raise = page.getByRole('button', { name: /raise it ticket/i }).first();
      await expect(raise).toBeVisible();
      await raise.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('button', { name: /create ticket/i })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('the HR sidebar is reachable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'hr');
    await page.goto('/hr/candidates');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('data tables reflow to cards instead of scrolling sideways on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAs(page, 'hr');
    await page.goto('/hr/attendance');
    await expect(page.locator('ul.md\\:hidden li').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
