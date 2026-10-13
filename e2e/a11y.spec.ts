import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** A player who has seen everything: every screen shows its full content. */
const prepare = async (page: Page, scheme: 'light' | 'dark') => {
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
    localStorage.setItem(
      'ballmania:player',
      JSON.stringify({
        version: 1,
        shards: 400,
        fragments: 30,
        worlds: ['nebula', 'neon', 'abyss', 'jewel', 'volcano'],
      }),
    );
    const levels: Record<string, { stars: number; best: number }> = {};
    for (let i = 1; i <= 12; i++)
      levels[`nebula-${String(i).padStart(2, '0')}`] = { stars: 2, best: 1 };
    localStorage.setItem('ballmania:progress', JSON.stringify({ version: 1, levels }));
  });
  await page.goto('./');
};

/** WCAG 2.1 A and AA rules, on the whole page. */
const audit = async (page: Page, name: string) => {
  // Let entrance animations end, so colours are measured at rest.
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const problems = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
  expect(problems, name).toEqual([]);
};

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`accessibility, ${scheme} theme`, () => {
    test('menus', async ({ page }) => {
      await prepare(page, scheme);
      await audit(page, 'home');
      await page.getByTestId('play').click();
      await audit(page, 'campaign');
      await page.getByTestId('observatory').click();
      await audit(page, 'observatory');
      await page.getByTestId('back').click();
      await page.getByTestId('home').click();
      await page.getByTestId('arcade').click();
      await audit(page, 'arcade');
      await page.getByTestId('home').click();
      await page.getByTestId('shop').click();
      await audit(page, 'shop');
      await page.getByTestId('home').click();
      await page.getByTestId('achievements').click();
      await audit(page, 'achievements');
      await page.getByTestId('home').click();
      await page.getByRole('button', { name: 'Settings' }).click();
      await audit(page, 'settings');
    });

    test('game, pause and result', async ({ page }) => {
      await prepare(page, scheme);
      await page.getByTestId('play').click();
      await page.getByTestId('level-neon-01').click();
      await expect(page.getByTestId('board')).toBeVisible();
      await audit(page, 'game');
      await page.getByTestId('pause').click();
      await audit(page, 'pause');
      // The quickest way to a result: spend the four shots of the first puzzle.
      await page.getByRole('button', { name: 'Quit' }).click();
      await page.getByTestId('home').click();
      await page.getByTestId('arcade').click();
      await page.getByTestId('puzzle-1').click();
      const board = page.getByTestId('board');
      await expect(board).toBeFocused();
      for (let shot = 0; shot < 4; shot++) {
        await page.keyboard.press('Space');
        await page.waitForTimeout(250);
      }
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
      await audit(page, 'result');
    });
  });
}
