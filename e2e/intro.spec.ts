import { expect, test } from '@playwright/test';

test('opens with the studio intro once per visit, and lets players skip it', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' })),
  );
  await page.goto('./');
  const intro = page.getByRole('img', { name: 'AdamRodWebTech presents Ballmania' });
  await expect(intro).toBeVisible();
  // It leaves on its own…
  await expect(intro).toBeHidden({ timeout: 5000 });
  await expect(page.getByTestId('play')).toBeVisible();
  // …and does not come back during the visit.
  await page.reload();
  await expect(page.getByTestId('play')).toBeVisible();
  await expect(intro).toHaveCount(0);
});

test('skips the studio intro with a key or a tap', async ({ page }) => {
  await page.goto('./');
  const intro = page.getByTestId('studio-intro');
  await expect(intro).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(intro).toBeHidden({ timeout: 3000 });
});
