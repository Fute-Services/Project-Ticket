import { test, expect } from '@playwright/test';
import { loginAs, collectErrors, signOut, ROLES } from './helpers';

// DataTable renders a <table> for desktop and a separate <ul> of cards for
// phones (both exist in the DOM at once; CSS hides whichever doesn't apply).
// .first() picks DOM order, which is the table, so on mobile that resolves
// to a hidden element these two tests need visible. Same skip
// search-and-tables.spec.js already uses for the same reason.
test.describe('Production Floor — interactive dashboard', () => {
  test('adding a render job updates frame/system stats and lists the job', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 768, 'table layout is desktop-only');
    const errors = collectErrors(page);
    await loginAs(page, 'production');
    await expect(page.getByRole('heading', { name: 'Production Floor' })).toBeVisible();

    // StatCard's label and value sit in separate sibling rows, so the value
    // lives two levels up from the label text, not one.
    const totalFrames = page.getByText('Total Frame Renders').locator('../..').getByText(/^\d+$/);
    const before = Number(await totalFrames.innerText());

    await page.getByLabel('Project Code').fill('PRJ-QA-01');
    await page.getByLabel('Frame No').fill('1-49');
    await page.getByLabel('Name of Person').fill('QA Bot');
    await page.getByRole('button', { name: /add render job/i }).click();

    await expect(page.getByText('PRJ-QA-01').first()).toBeVisible();
    await expect
      .poll(async () => Number(await totalFrames.innerText()))
      .toBe(before + 49); // "1-49" is 49 frames
    expect(errors).toEqual([]);
  });

  test('toggling a render job flips it between Rendering and Completed', async ({ page }) => {
    await loginAs(page, 'production');
    const toggle = page.getByRole('button', { name: 'Rendering', exact: true }).first();
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Completed', exact: true }).first()).toBeVisible();
  });

  test('rejects an incomplete render job', async ({ page }) => {
    await loginAs(page, 'production');
    const rowCountBefore = await page.locator('table tbody tr').count();
    // Project Code / Frame No / Name of Person are all `required` — the
    // browser's own validation blocks the submit before onSubmit ever runs,
    // so nothing gets added rather than a custom error message appearing.
    await page.getByRole('button', { name: /add render job/i }).click();
    await page.waitForTimeout(300);
    expect(await page.locator('table tbody tr').count()).toBe(rowCountBefore);
  });

  test('Report to IT creates a ticket that appears in the IT queue with its metadata', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 768, 'table layout is desktop-only');
    const errors = collectErrors(page);
    await loginAs(page, 'production');

    await page.getByRole('button', { name: /report to it/i }).click();
    await page.getByLabel('Issue', { exact: true }).fill('Render Node Server 70 GPU Crash — e2e');
    await page.getByRole('button', { name: /send to it/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // Same tab, no reload — TicketContext is one in-memory store for the
    // whole session, so signing out and back in as IT keeps the ticket.
    // Deliberately not using loginAs() for the second login: it always
    // calls page.goto('/'), which is a real navigation that would reset
    // every Context back to its seed data and defeat this exact check.
    await signOut(page);
    await expect(page).toHaveURL(/\/$/);
    await page.getByLabel(/email/i).fill(ROLES.it.email);
    await page.getByLabel('PASSWORD', { exact: true }).fill(ROLES.it.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(new RegExp(ROLES.it.home));
    await page.getByRole('button', { name: /^Tickets Queue/i }).click();

    const row = page.getByText('Render Node Server 70 GPU Crash — e2e').first();
    await expect(row).toBeVisible();
    await expect(page.getByText('Production').first()).toBeVisible();

    await page.locator('button[aria-label^="View details for ticket"]').first().click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('Employee ID')).toBeVisible();
    await expect(drawer.getByText('VPN No')).toBeVisible();
    await expect(drawer.getByText('Username')).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe('IT — data transfer routing rules', () => {
  test('Server 100 routes to a named approver and creates an approval', async ({ page }) => {
    await loginAs(page, 'it');
    await page.getByRole('button', { name: /^Data Requests/i }).click();
    await page.getByRole('button', { name: /new data request/i }).click();

    await page.getByLabel('Source Server').selectOption('Server 100');
    await page.getByLabel('Requester Name').fill('QA Bot');
    await page.getByLabel('Contact Number').fill('9999999999');
    await page.getByLabel('Folder Name').fill('E2E_Server100');
    await page.getByLabel('Folder Path').fill('D:\\E2E_Server100');
    await page.getByRole('button', { name: /submit for approval/i }).click();

    const card = page.getByText('E2E_Server100').first();
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByText("Payel Ma'am").first()).toBeVisible();

    await page.getByRole('button', { name: /^Approval Center/i }).click();
    await expect(page.getByText(/Data Transfer Approval/i).first()).toBeVisible();
  });

  test('Server 70 carries the Priority Wise tag instead of an approver', async ({ page }) => {
    await loginAs(page, 'it');
    await page.getByRole('button', { name: /^Data Requests/i }).click();
    await page.getByRole('button', { name: /new data request/i }).click();

    await page.getByLabel('Source Server').selectOption('Server 70');
    await page.getByLabel('Destination Server').selectOption('Server 29');
    await page.getByLabel('Requester Name').fill('QA Bot');
    await page.getByLabel('Contact Number').fill('9999999999');
    await page.getByLabel('Folder Name').fill('E2E_Server70');
    await page.getByLabel('Folder Path').fill('D:\\E2E_Server70');
    await page.getByRole('button', { name: /submit for approval/i }).click();

    const card = page.getByText('E2E_Server70').first();
    await card.click();
    await expect(page.getByText('Priority Wise')).toBeVisible();
  });
});

// DataTable renders a <table> for desktop and a separate <ul> of cards for
// phones (both exist in the DOM at once; CSS hides whichever doesn't apply),
// so a bare .first() on a row action can resolve to the hidden desktop copy
// below the md breakpoint. Same skip search-and-tables.spec.js already uses.
test.describe('IT — asset audit and search', () => {
  test('Asset ID search narrows the table to a single asset', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 768, 'table layout is desktop-only');
    await loginAs(page, 'it');
    await page.getByRole('button', { name: /^Asset Management/i }).click();
    await page.getByLabel('Filter by Asset ID').fill('AST-1001');
    await expect(page.getByText('AST-1001').first()).toBeVisible();
    await expect(page.getByText('AST-2001')).toHaveCount(0);
  });

  test('the audit drawer shows components, change log, and allocation history', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 768, 'table layout is desktop-only');
    await loginAs(page, 'it');
    await page.getByRole('button', { name: /^Asset Management/i }).click();
    await page.getByLabel('Filter by Asset ID').fill('AST-1001');
    await page.locator('button[aria-label^="View audit history"]').first().click();

    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText(/component inventory/i)).toBeVisible();
    await expect(drawer.getByText(/components change log/i)).toBeVisible();
    await expect(drawer.getByText(/asset allocation history/i)).toBeVisible();
    await expect(drawer.getByText('512GB NVMe SSD')).toBeVisible();
  });

  test('editing an asset logs a status change in its history', async ({ page, viewport }) => {
    test.skip(!!viewport && viewport.width < 768, 'table layout is desktop-only');
    await loginAs(page, 'it');
    await page.getByRole('button', { name: /^Asset Management/i }).click();
    await page.getByLabel('Filter by Asset ID').fill('AST-1003');

    await page.locator('button[aria-label="Edit asset AST-1003"]').first().click();
    await page.getByLabel('Status').selectOption('In Use');
    await page.getByRole('button', { name: /save changes/i }).click();

    await page.locator('button[aria-label^="View audit history for asset AST-1003"]').first().click();
    await expect(page.getByRole('dialog').getByText(/status changed from/i)).toBeVisible();
  });
});

test.describe('IT — Approval Center filters', () => {
  test('priority filter narrows the list', async ({ page }) => {
    await loginAs(page, 'it');
    await page.getByRole('button', { name: /^Approval Center/i }).click();

    await page.getByLabel('Priority filter').selectOption('High');
    await expect(page.getByText('System Access Request')).toBeVisible();
    await expect(page.getByText('Software Installation')).toHaveCount(0);

    await page.getByLabel('Priority filter').selectOption('All');
    await expect(page.getByText('Software Installation')).toBeVisible();
  });

  test('status filter isolates resolved requests', async ({ page }) => {
    await loginAs(page, 'it');
    await page.getByRole('button', { name: /^Approval Center/i }).click();

    await page.getByLabel('Status filter').selectOption('Resolved');
    await expect(page.getByText('Hardware Procurement')).toBeVisible();
    await expect(page.getByText('Software Installation')).toHaveCount(0);
  });

  test('sort order and category filter controls exist and respond', async ({ page }) => {
    await loginAs(page, 'it');
    await page.getByRole('button', { name: /^Approval Center/i }).click();

    await expect(page.getByLabel('Sort order')).toBeVisible();
    await expect(page.getByLabel('Category filter')).toBeVisible();
    await page.getByLabel('Sort order').selectOption('oldest');
    // No crash / stays on the page with the same controls present.
    await expect(page.getByLabel('Sort order')).toHaveValue('oldest');
  });
});
