import { test, expect } from '@playwright/test';
import { loginAs, collectErrors } from './helpers';

test.describe('search, filter and empty states', () => {
  test('candidate search narrows, empties, and restores', async ({ page }) => {
    const errors = collectErrors(page);
    await loginAs(page, 'hr');
    await page.goto('/hr/candidates');

    const counter = page.getByText(/\d+ of \d+ candidates/);
    const total = Number((await counter.innerText()).match(/of (\d+)/)[1]);

    // The page filter, not the global topbar search — both match /search/i.
    const search = page.getByPlaceholder(/name, skills, experience/i);
    await search.fill('Ananya');
    await expect
      .poll(async () => Number((await counter.innerText()).match(/^(\d+)/)[1]))
      .toBeLessThan(total);

    await search.fill('zzzzznomatch');
    await expect(page.getByText(/no candidates match these filters/i)).toBeVisible();

    await search.fill('');
    await expect
      .poll(async () => Number((await counter.innerText()).match(/^(\d+)/)[1]))
      .toBe(total);
    expect(errors).toEqual([]);
  });

  test('stage filter narrows the candidate list', async ({ page }) => {
    await loginAs(page, 'hr');
    await page.goto('/hr/candidates');
    const counter = page.getByText(/\d+ of \d+ candidates/);
    const total = Number((await counter.innerText()).match(/of (\d+)/)[1]);

    await page.getByRole('button', { name: 'Screening', exact: true }).click();
    await expect
      .poll(async () => Number((await counter.innerText()).match(/^(\d+)/)[1]))
      .toBeLessThan(total);

    await page.getByRole('button', { name: 'All Stages', exact: true }).click();
    await expect
      .poll(async () => Number((await counter.innerText()).match(/^(\d+)/)[1]))
      .toBe(total);
  });

  test('directory department filter narrows the employee list', async ({ page }) => {
    await loginAs(page, 'hr');
    await page.goto('/hr/directory');
    const counter = page.getByText(/\d+ of \d+ employees/);
    const total = Number((await counter.innerText()).match(/of (\d+)/)[1]);

    await page.getByRole('button', { name: 'Engineering', exact: true }).click();
    await expect
      .poll(async () => Number((await counter.innerText()).match(/^(\d+)/)[1]))
      .toBeLessThan(total);
  });
});

// Below md the DataTable deliberately renders cards instead of a <table>, so
// these header-sorting assertions only apply to the desktop layout. The mobile
// card reflow has its own test in overlays-and-responsive.spec.js.
test.describe('attendance table', () => {
  test.skip(({ viewport }) => !!viewport && viewport.width < 768, 'table layout is desktop-only');

  test("today's attendance shows real records, not an all-empty table", async ({ page }) => {
    await loginAs(page, 'hr');
    await page.goto('/hr/attendance');

    // Regression guard: TODAY used to be hardcoded past the end of the seed
    // data, so every row read "No record" and all the stat cards showed 0.
    const table = page.locator('table').first();
    await expect(table).toBeVisible();
    const noRecord = await table.getByText('No record').count();
    const rows = await table.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
    expect(noRecord, 'every attendance row is empty').toBeLessThan(rows);
  });

  test('sorting a column actually reorders the rows', async ({ page }) => {
    await loginAs(page, 'hr');
    await page.goto('/hr/attendance');
    const table = page.locator('table').first();
    const firstCol = () => table.locator('tbody tr td:first-child').allInnerTexts();

    const before = await firstCol();
    await table.getByRole('button', { name: /Employee/ }).click();
    const asc = await firstCol();
    await table.getByRole('button', { name: /Employee/ }).click();
    const desc = await firstCol();

    expect(asc).not.toEqual(desc);
    expect(desc).toEqual([...asc].reverse());
    expect(before.length).toBe(asc.length);
  });

  test('check-in column sorts by real values', async ({ page }) => {
    await loginAs(page, 'hr');
    await page.goto('/hr/attendance');
    const table = page.locator('table').first();
    const col = () => table.locator('tbody tr td:nth-child(3)').allInnerTexts();

    await table.getByRole('button', { name: /Check In/ }).click();
    const asc = await col();
    await table.getByRole('button', { name: /Check In/ }).click();
    const desc = await col();
    expect(asc, 'check-in values are all identical, so sorting is a no-op').not.toEqual(desc);
  });
});

test.describe('report exports', () => {
  test('every CSV export button downloads a populated file', async ({ page }) => {
    await loginAs(page, 'hr');
    await page.goto('/hr/reports');

    const cards = page.locator('div.bg-card').filter({ has: page.getByRole('button', { name: 'Generate' }) });
    const n = await cards.count();
    expect(n).toBeGreaterThan(0);

    for (let i = 0; i < n; i++) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        cards.nth(i).getByRole('button', { name: 'CSV' }).click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    }
  });

  test('the PDF export opens a printable window with the report rows', async ({ page, context }) => {
    await loginAs(page, 'hr');
    await page.goto('/hr/reports');
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'PDF' }).first().click(),
    ]);
    await expect(popup.locator('tbody tr').first()).toBeAttached();
    await popup.close();
  });
});
