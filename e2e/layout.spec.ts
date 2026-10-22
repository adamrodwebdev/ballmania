import { expect, overflowOf, test, type Page } from './fixtures';

/** Acceptance criterion (specification § 8): no horizontal scroll from 320 to 1,920 pixels. */
const WIDTHS = [320, 375, 768, 1024, 1280, 1920];

/** Nothing scrolls sideways: neither the page nor the screen's own frame (v1.7.6). */
const noOverflow = async (page: Page, name: string) => {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const screen = document.querySelector('main');
    return Math.max(
      root.scrollWidth - root.clientWidth,
      screen ? screen.scrollWidth - screen.clientWidth : 0,
    );
  });
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

  /**
   * The portals' landscape frames (CrazyGames iframes, phones on their side,
   * fullscreen), and phones on their side, the smallest last (v1.7.6).
   */
  const FRAMES = [
    [907, 510],
    [821, 462],
    [800, 450],
    [915, 412],
    [1280, 720],
    [844, 390],
    [640, 400],
    [734, 343],
  ] as const;

  for (const [width, height] of FRAMES) {
    test(`shows the whole campaign map without scrolling at ${width}×${height}`, async ({
      page,
    }) => {
      test.skip(test.info().project.name !== 'desktop', 'desktop project only');
      await page.setViewportSize({ width, height });
      await page.goto('./');
      await page.getByTestId('play').click();
      const last = page.getByTestId('level-nebula-12');
      await expect(last).toBeInViewport({ ratio: 1 });
      // The screen's entrance (a short slide) is over once the last tile has settled.
      await expect.poll(() => overflowOf(page)).toBeLessThanOrEqual(0);
    });
  }
});
