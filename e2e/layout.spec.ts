import { expect, overflowOf, test, type Page } from './fixtures';

/**
 * Acceptance criterion (specification § 8, widened by v1.7.6): no horizontal
 * scroll from 320 to 2,560 pixels, on every screen, in a tall window and in a
 * short one (the compact layouts take over below 800 and 460 px).
 */
const WIDTHS = [
  320, 360, 375, 390, 414, 480, 540, 600, 640, 720, 768, 800, 834, 900, 1024, 1180, 1280, 1366,
  1440, 1600, 1920, 2240, 2560,
];
const HEIGHTS = [900, 450];

/** How far the page, or the screen's own frame, scrolls sideways (v1.7.6). */
const sideways = (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    const screen = document.querySelector('main');
    return Math.max(
      root.scrollWidth - root.clientWidth,
      screen ? screen.scrollWidth - screen.clientWidth : 0,
    );
  });

/** Every size of the sweep where the screen shown scrolls sideways. */
const sweep = async (page: Page) => {
  const found: string[] = [];
  for (const height of HEIGHTS) {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height });
      // Let the layout and the resize observers (the world deck, the board) follow.
      await page.evaluate(
        () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
      );
      const overflow = await sideways(page);
      if (overflow > 0) found.push(`${width}×${height}: ${overflow} px`);
    }
  }
  return found;
};

/** How to reach each screen from the title screen. */
const SCREENS: Record<string, (page: Page) => Promise<void>> = {
  title: async () => {},
  campaign: async (page) => {
    await page.getByTestId('play').click();
    await expect(page.getByTestId('level-nebula-12')).toBeAttached();
  },
  observatory: async (page) => {
    await page.getByTestId('observatory').click();
  },
  arcade: async (page) => {
    await page.getByTestId('arcade').click();
  },
  workshop: async (page) => {
    await page.getByTestId('shop').click();
  },
  achievements: async (page) => {
    await page.getByTestId('achievements').click();
  },
  settings: async (page) => {
    await page.getByTestId('open-settings').click();
  },
  game: async (page) => {
    await page.getByTestId('arcade').click();
    await page.getByTestId('duel-normal').click();
    await expect(page.getByTestId('board')).toBeVisible();
  },
  pause: async (page) => {
    await page.getByTestId('arcade').click();
    await page.getByTestId('duel-normal').click();
    await page.getByTestId('pause').click();
  },
};

test.describe('layout', () => {
  for (const [name, open] of Object.entries(SCREENS)) {
    test(`never scrolls sideways on the ${name} screen, from 320 to 2560 px`, async ({ page }) => {
      // The viewport is swept: one project is enough.
      test.skip(test.info().project.name !== 'desktop', 'desktop project only');
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
      await open(page);
      expect(await sweep(page)).toEqual([]);
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
