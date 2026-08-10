import { test, expect } from '@playwright/test';
import { loginAs, collectErrors } from './helpers';

test.describe('employee — raise an IT ticket', () => {
  test('rejects an empty description, then creates and lists the ticket', async ({ page }) => {
    const errors = collectErrors(page);
    await loginAs(page, 'employee');

    await page.getByRole('button', { name: /raise ticket/i }).first().click();
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Description is `required`; submitting empty must not create anything.
    await page.getByRole('button', { name: /create ticket/i }).click();
    await expect(form).toBeVisible();

    await page.getByPlaceholder(/describe your issue/i).fill('Laptop will not boot past the BIOS screen.');
    await page.getByRole('button', { name: /create ticket/i }).click();

    await expect(page.getByText(/ticket created successfully/i)).toBeVisible();
    await expect(form).toBeHidden({ timeout: 5000 });

    await page.getByRole('button', { name: 'My Tickets', exact: true }).click();
    await expect(page.getByText(/Laptop will not boot past the BIOS screen/i).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('cancel closes the ticket form without creating anything', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.getByRole('button', { name: 'My Tickets', exact: true }).click();
    const before = await page.locator('body').innerText();

    await page.getByRole('button', { name: /raise ticket|new ticket/i }).first().click();
    await expect(page.locator('form')).toBeVisible();
    await page.getByRole('button', { name: /^cancel$/i }).click();
    await expect(page.locator('form')).toBeHidden();

    expect(await page.locator('body').innerText()).toBe(before);
  });
});

test.describe('coordinator — task management', () => {
  test('creates a task and it appears in the list and the count', async ({ page }) => {
    const errors = collectErrors(page);
    await loginAs(page, 'coordinator');
    await page.goto('/coordinator/tasks');

    const counter = page.getByText(/\d+ of \d+ tasks/);
    const before = Number((await counter.innerText()).match(/of (\d+)/)[1]);

    await page.getByRole('button', { name: /assign task/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('QA regression sweep');
    await dialog.getByLabel('Due Date').fill('2026-09-15');
    await dialog.getByRole('button', { name: /^assign$/i }).click();

    await expect
      .poll(async () => Number((await counter.innerText()).match(/of (\d+)/)[1]))
      .toBe(before + 1);
    await expect(page.getByText('QA regression sweep').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('a task with no due date is rejected and nothing is created', async ({ page }) => {
    await loginAs(page, 'coordinator');
    await page.goto('/coordinator/tasks');
    const counter = page.getByText(/\d+ of \d+ tasks/);
    const before = Number((await counter.innerText()).match(/of (\d+)/)[1]);

    await page.getByRole('button', { name: /assign task/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('Missing a due date');
    await dialog.getByRole('button', { name: /^assign$/i }).click();

    await expect(dialog, 'the dialog stays open on invalid input').toBeVisible();
    expect(Number((await counter.innerText()).match(/of (\d+)/)[1])).toBe(before);
  });

  test('filters tasks by project and restores on All Projects', async ({ page }) => {
    await loginAs(page, 'coordinator');
    await page.goto('/coordinator/tasks');
    const counter = page.getByText(/\d+ of \d+ tasks/);
    const total = Number((await counter.innerText()).match(/of (\d+)/)[1]);

    // The project filter is a row of pills, not a <select>.
    await page.getByRole('button', { name: 'Mobile App v2', exact: true }).click();
    await expect
      .poll(async () => Number((await counter.innerText()).match(/^(\d+)/)[1]))
      .toBeLessThan(total);

    await page.getByRole('button', { name: 'All Projects', exact: true }).click();
    await expect
      .poll(async () => Number((await counter.innerText()).match(/^(\d+)/)[1]))
      .toBe(total);
  });

  test('board and list views both render the tasks', async ({ page }) => {
    await loginAs(page, 'coordinator');
    await page.goto('/coordinator/tasks');
    // List/Board are Radix tabs, not plain buttons.
    await page.getByRole('tab', { name: 'Board' }).click();
    await expect(page.getByRole('tabpanel', { name: 'Board' })).toBeVisible();
    await page.getByRole('tab', { name: 'List' }).click();
    await expect(page.getByRole('tabpanel', { name: 'List' })).toBeVisible();
  });
});

test.describe('HR — email folders, drafts and replies', () => {
  test('template becomes a draft, validates, sends, and lands in Sent', async ({ page }) => {
    const errors = collectErrors(page);
    await loginAs(page, 'hr');
    await page.goto('/hr/email');

    await page.getByRole('button', { name: /^templates/i }).click();
    await page.getByRole('button', { name: /use template/i }).first().click();

    const to = page.getByPlaceholder(/^To:/);
    await expect(to).toBeVisible();

    const send = page.getByRole('button', { name: /^send$/i });
    await expect(send, 'Send is disabled with an empty recipient').toBeDisabled();
    await to.fill('candidate@example.com');
    await expect(send, 'Send enables once To and Subject are set').toBeEnabled();

    await send.click();
    await page.getByRole('button', { name: /^sent/i }).click();
    await expect(page.getByText('candidate@example.com').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('replying to an inbox message appends to the thread and the Sent folder', async ({ page }) => {
    await loginAs(page, 'hr');
    await page.goto('/hr/email');

    const reply = page.getByPlaceholder(/write a reply/i);
    const send = page.getByRole('button', { name: /send reply/i });
    await expect(send, 'Send Reply is disabled while the box is empty').toBeDisabled();

    await reply.fill('Thanks — scheduling the next round now.');
    await expect(send).toBeEnabled();
    await send.click();

    await expect(page.getByText('Thanks — scheduling the next round now.').first()).toBeVisible();
    await expect(reply, 'the reply box resets after sending').toHaveValue('');

    await page.getByRole('button', { name: /^sent/i }).click();
    await expect(page.getByText(/Thanks — scheduling the next round now/).first()).toBeVisible();
  });

  test('discarding a draft removes it', async ({ page }) => {
    await loginAs(page, 'hr');
    await page.goto('/hr/email');
    await page.getByRole('button', { name: /^templates/i }).click();
    await page.getByRole('button', { name: /use template/i }).first().click();
    await expect(page.getByPlaceholder(/^To:/)).toBeVisible();
    await page.getByRole('button', { name: /discard/i }).click();
    await expect(page.getByPlaceholder(/^To:/)).toBeHidden();
  });
});
