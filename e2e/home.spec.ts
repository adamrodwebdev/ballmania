import { expect, test } from '@playwright/test';

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
    await page.getByTestId('locale').selectOption('id');
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.getByText('Segera hadir').first()).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page).toHaveTitle(/tembak bola/);
  });

  test('keeps the chosen theme from the first paint after a reload', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('theme').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
