import { expect, test } from './fixtures';

test.describe('home', () => {
  test('shows the game without errors nor horizontal scroll', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: 'Ballmania' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    expect(errors).toEqual([]);
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
    const scroll = () =>
      page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
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
