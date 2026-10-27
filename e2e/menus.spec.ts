import { expect, overflowOf, test, type Page } from './fixtures';

/**
 * The Workshop and the Observatory (v1.8.0, step 8): each on one screen, from
 * 360 × 640 to 2560 px, phones on their side and the portals' frames included;
 * on 320 × 568 only the Workshop's cards scroll, in their own frame. The
 * fitting room plays the cosmetic touched with the game's own engine, and
 * none of its code loads before the Workshop opens. The wallet is in sight on
 * every menu screen.
 */

/** A player midway through world 1, by default in the longest of the four languages. */
const prepare = async (page: Page, locale = 'ru') => {
  await page.addInitScript((locale) => {
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale }));
    localStorage.setItem(
      'ballmania:player',
      JSON.stringify({
        version: 2,
        shards: 280,
        fragments: 18,
        upgrades: { eye: 1, catcher: 2, chronos: 1, anchor: 2 },
        training: { step: 1, done: true },
      }),
    );
  }, locale);
  await page.goto('./');
};

const SIZES = [
  [360, 640],
  [360, 800],
  [390, 844],
  [393, 659],
  [768, 1024],
  [844, 390],
  [907, 510],
  [821, 462],
  [800, 450],
  [915, 412],
  [640, 400],
  [734, 343],
  [1280, 720],
  [1280, 800],
  [1920, 1080],
  [2560, 1440],
] as const;

/** How far the parts of the screen that scroll in their own frames do (cards, tiles, the detail). */
const listOverflow = (page: Page) =>
  page.evaluate(() =>
    Math.max(
      0,
      ...[...document.querySelectorAll('main *')]
        .filter((part) => ['auto', 'scroll'].includes(getComputedStyle(part).overflowY))
        .map((part) => part.scrollHeight - part.clientHeight),
    ),
  );

const settle = (page: Page) =>
  page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );

/** Every size of the sweep where something scrolls: the page, the screen or one of its lists. */
const sweep = async (page: Page) => {
  const found: string[] = [];
  for (const [width, height] of SIZES) {
    await page.setViewportSize({ width, height });
    await settle(page);
    let screen = await overflowOf(page);
    let lists = await listOverflow(page);
    if (screen > 0 || lists > 0) {
      // On a busy machine the layout may still be settling (a pixel too many, now and
      // then, at 734 × 343): measure again once it has. A real overflow stays.
      await page.waitForTimeout(250);
      await settle(page);
      screen = await overflowOf(page);
      lists = await listOverflow(page);
    }
    if (screen > 0 || lists > 0) found.push(`${width}×${height}: screen ${screen}, lists ${lists}`);
  }
  // The smallest phone: only a list may scroll, in its own frame.
  await page.setViewportSize({ width: 320, height: 568 });
  await settle(page);
  const screen = await overflowOf(page);
  if (screen > 0) found.push(`320×568: screen ${screen}`);
  return found;
};

test.describe('the Workshop and the Observatory (v1.8.0)', () => {
  test.beforeEach(({ page: _page }, info) => {
    test.skip(info.project.name !== 'desktop', 'the viewport is swept: one project is enough');
  });

  for (const tab of ['shooter', 'trail', 'burst', 'board'] as const) {
    test(`the Workshop's ${tab} tab fits on one screen at every size`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await prepare(page);
      await page.getByTestId('shop').click();
      await page.getByTestId(`tab-${tab}`).click();
      expect(await sweep(page)).toEqual([]);
    });
  }

  for (const tab of ['shot', 'chain', 'weather'] as const) {
    test(`the Observatory's ${tab} tab fits on one screen at every size`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await prepare(page);
      await page.getByTestId('observatory').click();
      await page.getByTestId(`tab-${tab}`).click();
      expect(await sweep(page)).toEqual([]);
    });
  }

  test('the fitting room plays the cosmetic touched, loaded only with the Workshop', async ({
    page,
  }) => {
    const fitting: string[] = [];
    page.on('request', (request) => {
      if (/fitting/i.test(request.url())) fitting.push(request.url());
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await prepare(page, 'en');
    await page.getByTestId('play').click();
    await expect(page.getByTestId('level-nebula-12')).toBeAttached();
    await page.getByTestId('home').click();
    expect(fitting).toEqual([]);
    await page.getByTestId('shop').click();
    // The engine's first frame takes over from the cosmetic's own picture.
    await expect(page.getByTestId('fitting-room')).toBeVisible();
    await expect(page.getByTestId('fitting-stand-in')).toHaveCount(0, { timeout: 10_000 });
    expect(fitting.length).toBeGreaterThan(0);
    await page.getByTestId('tab-burst').click();
    await page.getByTestId('item-burst-petals').click();
    await expect(page.getByTestId('item-detail')).toContainText('Petals');
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test('keeps the wallet in sight on every menu screen', async ({ page }) => {
    await prepare(page, 'en');
    // The pause menu holds its own wallet over the game (whose bar counts the fragments caught).
    const inSight = async (name: string, within = page.locator('main')) => {
      await expect(within.getByTestId('wallet'), name).toBeInViewport();
      await expect(within.getByTestId('wallet'), name).toContainText('280 shards');
      await expect(within.getByTestId('fragments'), name).toContainText('18 fragments');
    };
    await inSight('home');
    await page.getByTestId('play').click();
    await inSight('map');
    await page.getByTestId('observatory').click();
    await inSight('observatory');
    await page.getByTestId('back').click();
    await page.getByTestId('home').click();
    await page.getByTestId('shop').click();
    await inSight('workshop');
    await page.getByTestId('home').click();
    await page.getByTestId('arcade').click();
    await inSight('arcade');
    await page.getByTestId('home').click();
    await page.getByTestId('achievements').click();
    await inSight('goals');
    await page.getByTestId('home').click();
    await page.getByTestId('play').click();
    await page.getByTestId('level-nebula-01').click();
    await expect(page.getByTestId('board')).toBeVisible();
    await page.getByTestId('pause').click();
    await inSight('pause', page.getByRole('dialog'));
  });

  test('counts the balance down as it pays, the difference rising from it', async ({ page }) => {
    await prepare(page, 'en');
    await page.getByTestId('shop').click();
    await page.getByRole('button', { name: 'Buy · 150 shards' }).click();
    await expect(page.getByTestId('wallet')).toContainText('130 shards');
    await expect(page.getByTestId('wallet')).toContainText('−150');
    await expect(page.getByTestId('item-detail')).toContainText('Launcher · Equipped');
  });
});
