import { expect, test } from '@playwright/test';

test.describe('game', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' })),
    );
    await page.goto('./');
    await page.getByTestId('play').click();
    await expect(page.getByTestId('board')).toBeVisible();
  });

  test('plays without errors nor horizontal scroll', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    const board = page.getByTestId('board');
    const box = (await board.boundingBox())!;
    for (let i = 0; i < 5; i++) {
      await board.click({ position: { x: box.width * (0.3 + i * 0.1), y: box.height * 0.2 } });
    }
    await page.getByTestId('swap').click();
    await page.keyboard.press('Space');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    expect(errors).toEqual([]);
  });

  test('pauses, resumes and quits', async ({ page }) => {
    await page.getByTestId('pause').click();
    const dialog = page.getByRole('dialog', { name: 'Game paused' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Resume' }).click();
    await expect(dialog).toBeHidden();

    await page.getByTestId('board').focus();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Quit' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Ballmania' })).toBeVisible();
  });

  test('keeps touch targets large enough', async ({ page }) => {
    for (const id of ['pause', 'swap']) {
      const box = (await page.getByTestId(id).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('settings', () => {
  test('changes the effects, volume and vibrations, and remembers them', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
        sessionStorage.setItem('seeded', '1');
      }
    });
    await page.goto('./');
    await page.getByTestId('open-settings').click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('effects-subtle').check();
    await dialog.getByTestId('volume').fill('30');
    await dialog.getByTestId('vibration').uncheck();
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    const saved = await page.evaluate(() => localStorage.getItem('ballmania:settings'));
    expect(JSON.parse(saved!)).toMatchObject({ effects: 'subtle', volume: 0.3, vibration: false });
  });

  test('opens from the pause menu', async ({ page }) => {
    await page.goto('./');
    await page.getByTestId('play').click();
    await page.getByTestId('pause').click();
    await page.getByRole('dialog').getByTestId('open-settings').click();
    await expect(page.getByTestId('settings')).toBeVisible();
  });
});
