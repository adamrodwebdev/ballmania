import { expect, test, type Page } from './fixtures';

/**
 * Touch, text and safe areas (v1.7.6, validated mockup): the frequent buttons
 * are 48 px under a finger, the world names 44 px, the HUD's words 14 px in
 * CrazyGames' smallest frame, fields 16 px; menus and board keep clear of a
 * notch and of the home bar; a very wide desktop window keeps a 2:1 frame;
 * the browser's bar takes the theme's colour.
 */

/** English, and the theme given (the default, dark, when null); a reload keeps what was saved. */
const seed = (theme: 'dark' | 'light' | null) => {
  if (localStorage.getItem('ballmania:settings')) return;
  localStorage.setItem(
    'ballmania:settings',
    JSON.stringify(theme ? { locale: 'en', theme } : { locale: 'en' }),
  );
};

const startFirstLevel = async (page: Page) => {
  await page.goto('./');
  await page.getByTestId('play').click();
  await page.getByTestId('level-nebula-01').click();
  await expect(page.getByTestId('board')).toBeVisible();
};

/** Heights in CSS pixels of the elements matched, visible ones only. */
const heights = (page: Page, selector: string) =>
  page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)]
        .map((element) => element.getBoundingClientRect().height)
        .filter((height) => height > 0),
    selector,
  );

/** Where the level lies on screen, in CSS pixels (CanvasRenderer's dataset). */
const levelBox = (page: Page) =>
  page.getByTestId('board').evaluate((canvas: HTMLCanvasElement) => {
    const { scale, offsetX, offsetY, content } = canvas.dataset;
    const [left, top, right, bottom] = (content ?? '').split(' ').map(Number) as [
      number,
      number,
      number,
      number,
    ];
    const k = Number(scale);
    return {
      left: Number(offsetX) + left * k,
      top: Number(offsetY) + top * k,
      right: Number(offsetX) + right * k,
      bottom: Number(offsetY) + bottom * k,
    };
  });

test.describe('touch and text', () => {
  test.describe('under a finger', () => {
    test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });

    test('gives the buttons pressed all game long 48 px, the others 44', async ({ page }) => {
      test.skip(test.info().project.name !== 'mobile', 'mobile project only');
      await page.addInitScript(seed, null);
      await startFirstLevel(page);
      for (const height of await heights(page, '.controls .control')) {
        expect(height).toBeGreaterThanOrEqual(48);
      }
      for (const height of await heights(page, '.hud .btn')) {
        expect(height).toBeGreaterThanOrEqual(44);
      }
    });

    test('names each world on a button 44 px tall', async ({ page }) => {
      test.skip(test.info().project.name !== 'mobile', 'mobile project only');
      await page.addInitScript(seed, null);
      await page.goto('./');
      await page.getByTestId('play').click();
      // The deck draws its row of names once it is set up.
      await expect(page.locator('.bullets button')).toHaveCount(6);
      for (const height of await heights(page, '.bullets button')) {
        expect(height).toBeGreaterThanOrEqual(44);
      }
    });

    test('lists its choices at 16 px, so that iOS does not zoom in', async ({ page }) => {
      test.skip(test.info().project.name !== 'mobile', 'mobile project only');
      await page.addInitScript(seed, null);
      await page.goto('./');
      await page.getByTestId('open-settings').click();
      const sizes = await page.evaluate(() =>
        [...document.querySelectorAll('dialog[open] select')].map((select) =>
          parseFloat(getComputedStyle(select).fontSize),
        ),
      );
      expect(sizes.length).toBeGreaterThan(0);
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(16);
    });
  });

  test("writes the HUD's words at 14 px at least in CrazyGames' smallest frame", async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'desktop', 'desktop project only');
    await page.setViewportSize({ width: 821, height: 462 });
    await page.addInitScript(seed, null);
    await startFirstLevel(page);
    const smallest = await page.evaluate(() => {
      let least = Infinity;
      for (const root of document.querySelectorAll('.hud, .chips, .controls')) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const element = node.parentElement;
          if (!node.textContent?.trim() || !element) continue;
          if (element.getBoundingClientRect().width === 0) continue;
          least = Math.min(least, parseFloat(getComputedStyle(element).fontSize));
        }
      }
      return least;
    });
    expect(smallest).toBeGreaterThanOrEqual(14);
  });

  test("paints the browser's bar in the colour of the theme shown", async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'desktop project only');
    const bar = page.locator('meta[name="theme-color"]');
    // Dark by default, whatever the system says.
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript(seed, null);
    await page.goto('./');
    await expect(page.getByTestId('play')).toBeVisible();
    await expect(bar).toHaveAttribute('content', '#05030d');
    await page.evaluate(() =>
      localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en', theme: 'light' })),
    );
    await page.reload();
    await expect(page.getByTestId('play')).toBeVisible();
    await expect(bar).toHaveAttribute('content', '#f4f2fb');
  });

  test.describe('on a phone on its side, with a notch and a home bar', () => {
    test.use({ isMobile: true, hasTouch: true, viewport: { width: 844, height: 390 } });

    test('keeps the menus and the board clear of them', async ({ page }) => {
      test.skip(test.info().project.name !== 'mobile', 'mobile project only');
      const cdp = await page.context().newCDPSession(page);
      // An iPhone: the notch on the left, as much room on the right, the home bar below.
      await cdp.send('Emulation.setSafeAreaInsetsOverride', {
        insets: { top: 0, left: 47, right: 47, bottom: 21 },
      });
      await page.addInitScript(seed, null);
      await page.goto('./');
      const left = async (testId: string) => (await page.getByTestId(testId).boundingBox())!.x;
      expect(await left('play')).toBeGreaterThanOrEqual(47);
      await page.getByTestId('play').click();
      await expect(page.getByTestId('level-nebula-12')).toBeVisible();
      expect(await left('home')).toBeGreaterThanOrEqual(47);
      await page.getByTestId('level-nebula-01').click();
      await expect(page.getByTestId('board')).toBeVisible();
      await expect.poll(async () => (await levelBox(page)).bottom).toBeLessThanOrEqual(390 - 21);
      const level = await levelBox(page);
      expect(level.left).toBeGreaterThanOrEqual(47);
      expect(level.right).toBeLessThanOrEqual(844 - 47);
    });
  });

  test('keeps a 2:1 playing frame in a window wider than that', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'desktop project only');
    await page.setViewportSize({ width: 2560, height: 1080 });
    await page.addInitScript(seed, null);
    await startFirstLevel(page);
    // The frame: 2160 px wide in the middle, 200 px of art on each side.
    const rails = await page.evaluate(() => ({
      left: document.querySelector('.hud')!.getBoundingClientRect().left,
      right: document.querySelector('.controls')!.getBoundingClientRect().right,
    }));
    expect(rails.left).toBeCloseTo(200, 0);
    expect(rails.right).toBeCloseTo(2360, 0);
    const level = await levelBox(page);
    expect(level.left).toBeGreaterThanOrEqual(200);
    expect(level.right).toBeLessThanOrEqual(2360);
  });
});
