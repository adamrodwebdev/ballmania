import { expect, test, type Page } from '@playwright/test';

/** Acceptance criterion (specification § 8): no horizontal scroll from 320 to 1,920 pixels. */
const WIDTHS = [320, 375, 768, 1024, 1280, 1920];

const noOverflow = async (page: Page, name: string) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, name).toBe(0);
};

test.describe('layout', () => {
  for (const width of WIDTHS) {
    test(`never scrolls sideways at ${width} px`, async ({ page }) => {
      // The viewport is set per width: one project is enough.
      test.skip(test.info().project.name !== 'desktop', 'desktop project only');
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript(() => {
        localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'id' }));
        localStorage.setItem(
          'ballmania:player',
          JSON.stringify({
            version: 1,
            fragments: 30,
            worlds: ['nebula', 'neon', 'abyss', 'jewel'],
          }),
        );
      });
      await page.goto('./');
      await noOverflow(page, 'home');
      await page.getByTestId('play').click();
      await noOverflow(page, 'campaign');
      await page.getByTestId('observatory').click();
      await noOverflow(page, 'observatory');
      await page.getByTestId('back').click();
      await page.getByTestId('home').click();
      await page.getByTestId('arcade').click();
      await noOverflow(page, 'arcade');
      await page.getByTestId('duel-normal').click();
      await expect(page.getByTestId('board')).toBeVisible();
      await noOverflow(page, 'duel');
      await page.getByTestId('pause').click();
      await noOverflow(page, 'pause');
    });
  }
});
