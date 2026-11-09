import { expect, overflowOf, test } from './fixtures';

test.describe('home', () => {
  test('shows the game without errors nor horizontal scroll', async ({ page, consoleErrors }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: 'Ballmania' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    expect(await consoleErrors()).toEqual([]);
  });

  test('switches language and remembers it', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('open-settings').click();
    await page.getByTestId('locale').selectOption('id');
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.getByRole('heading', { name: 'Pengaturan' })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page).toHaveTitle(/tembak bola/);
  });

  test('gives the daily gift once a day, then folds the card away', async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    });
    await page.clock.setFixedTime(new Date(2026, 9, 21, 10));
    // The whole title screen fits, with the card as with its pill and the wallet.
    const scroll = () => overflowOf(page);
    await page.goto('./');
    const gift = page.getByTestId('gift');
    await expect(gift).toContainText('Day 1 of 7');
    expect(await scroll()).toBeLessThanOrEqual(0);
    await page.getByTestId('gift-collect').click();
    await expect(gift).toHaveCount(0);
    await expect(page.getByTestId('gift-taken')).toContainText('Tomorrow +20');
    await expect(page.getByTestId('wallet')).toHaveText(/15 shards/);
    expect(await scroll()).toBeLessThanOrEqual(0);
    await page.reload();
    await expect(page.getByTestId('gift-taken')).toBeVisible();
    // The next day, day 2 of the streak.
    await page.clock.setFixedTime(new Date(2026, 9, 22, 10));
    await page.reload();
    await expect(page.getByTestId('gift')).toContainText('Day 2 of 7');
    await expect(page.getByTestId('gift-collect')).toContainText('+20');
    expect(await scroll()).toBeLessThanOrEqual(0);
  });

  test('starts on tampered saves, reads what it can, and keeps a profile it cannot read', async ({
    page,
    consoleErrors,
  }) => {
    const newer = '{"version":3,"shards":900}';
    await page.addInitScript((newer) => {
      localStorage.setItem(
        'ballmania:settings',
        '{"locale":"en","theme":["light"],"volume":"0.5","__proto__":{"theme":"light"}}',
      );
      localStorage.setItem(
        'ballmania:progress',
        '{"version":1,"levels":{"nebula-01":{"stars":"3","best":1e999},"constructor":{"stars":3}}}',
      );
      localStorage.setItem('ballmania:player', newer);
    }, newer);
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: 'Ballmania' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // Opening the Observatory notes its tip as seen: never over a profile the game cannot read.
    await page.getByTestId('observatory').click();
    await expect(page.getByRole('heading', { name: 'Observatory', level: 1 })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('ballmania:player'))).toBe(newer);
    expect(await consoleErrors()).toEqual([]);
  });

  test('keeps the chosen theme from the first paint after a reload', async ({ page }) => {
    await page.goto('./');
    // The cosmos (dark) is the game's own look, from the very first visit.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByTestId('open-settings').click();
    await page.getByTestId('theme').selectOption('light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

