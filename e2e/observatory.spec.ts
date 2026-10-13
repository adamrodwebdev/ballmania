import { expect, test } from '@playwright/test';

test('spends star fragments on upgrades at the Observatory', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    localStorage.setItem('ballmania:player', JSON.stringify({ version: 1, fragments: 20 }));
  });
  await page.goto('./');
  await expect(page.getByTestId('upgrade-ready')).toHaveText('Upgrade available');
  await page.getByTestId('observatory').click();
  await expect(page.getByRole('heading', { name: 'Observatory', level: 1 })).toBeVisible();
  await expect(page.getByTestId('fragments')).toContainText('20 fragments');
  await page.getByTestId('buy-nova').click();
  await expect(page.getByTestId('fragments')).toContainText('15 fragments');
  await expect(page.getByLabel('Rank 1 of 3').first()).toBeVisible();
  await page.getByTestId('buy-nova').click();
  await expect(page.getByTestId('fragments')).toContainText('3 fragments');
  await expect(page.getByTestId('buy-nova')).toBeDisabled();
  await page.getByTestId('back').click();
  await expect(page.getByTestId('upgrade-ready')).toHaveCount(0);
});
