import { expect, test, type Page } from './fixtures';

/**
 * The portals' rules on the page around the game (v1.7.6, Playgama and
 * CrazyGames): it never scrolls, whatever the window, the keys or the wheel;
 * the game draws 60 frames a second at most on a touch screen; and a restart
 * after the phone was turned picks the board's shape again.
 */

/** Playgama's test sizes, then CrazyGames' frames: desktop, fullscreen, mobile, tablet. */
const PORTAL_SIZES = [
  [360, 640],
  [390, 844],
  [915, 412],
  [1280, 720],
  [1920, 1080],
  [2560, 1440],
  [907, 510],
  [1216, 684],
  [1077, 606],
  [821, 462],
  [1366, 768],
  [1536, 864],
  [800, 450],
  [1080, 607],
] as const;

/** How far the page itself scrolls down, and anything across (page or screen). */
const pageScroll = (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    const screen = document.querySelector('main');
    return {
      down: root.scrollHeight - root.clientHeight,
      across: Math.max(
        root.scrollWidth - root.clientWidth,
        screen ? screen.scrollWidth - screen.clientWidth : 0,
      ),
    };
  });

const RETURNING = () => {
  localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' }));
  localStorage.setItem(
    'ballmania:player',
    JSON.stringify({ version: 1, fragments: 30, worlds: ['nebula', 'neon', 'abyss', 'jewel'] }),
  );
};

test.describe('portal rules', () => {
  for (const [width, height] of PORTAL_SIZES) {
    test(`shows no page scrollbar at ${width}×${height}`, async ({ page }) => {
      // The viewport is set per size: one project is enough.
      test.skip(test.info().project.name !== 'desktop', 'desktop project only');
      await page.setViewportSize({ width, height });
      await page.addInitScript(RETURNING);
      for (const tile of ['play', 'observatory', 'arcade', 'shop', 'achievements', null]) {
        await page.goto('./');
        if (tile) await page.getByTestId(tile).click();
        // The screen's entrance (a short slide) is over once its frame has settled.
        await expect.poll(() => pageScroll(page), tile ?? 'home').toEqual({ down: 0, across: 0 });
      }
    });
  }

  test("never scrolls a portal's page with the keys or the wheel", async ({ page, baseURL }) => {
    test.skip(test.info().project.name !== 'desktop', 'desktop project only');
    await page.addInitScript(RETURNING);
    // The portal's page: taller than the window, the game in an 800 × 450 frame at its top.
    await page.setContent(
      `<body style="margin:0;height:4000px"><iframe src="${baseURL}" ` +
        'style="width:800px;height:450px;border:0"></iframe></body>',
    );
    const game = page.frameLocator('iframe');
    const portalScroll = () => page.evaluate(() => window.scrollY);
    const press = async () => {
      for (const key of ['PageDown', 'ArrowDown', 'End', 'Space', 'PageUp', 'Home', 'ArrowUp']) {
        await page.keyboard.press(key);
      }
    };

    // The title screen fits its frame: nothing to scroll, and the portal stays put.
    await game.locator('#home-title').click();
    await press();
    await page.mouse.move(400, 200);
    await page.mouse.wheel(0, 800);
    expect(await portalScroll()).toBe(0);

    // A screen longer than its frame scrolls inside the game, and only there.
    await game.getByTestId('observatory').click();
    await game.locator('#observatory-title').click();
    await page.keyboard.press('End');
    const screen = game.locator('main');
    await expect
      .poll(() => screen.evaluate((main) => main.scrollTop + main.clientHeight - main.scrollHeight))
      .toBeGreaterThanOrEqual(-1);
    await page.keyboard.press('PageDown');
    await page.mouse.wheel(0, 800);
    expect(await portalScroll()).toBe(0);

    // In play, the keys aim and fire; the others do nothing to the portal either.
    await game.getByTestId('back').click();
    await game.getByTestId('play').click();
    await game.getByTestId('level-nebula-01').click();
    await expect(game.getByTestId('board')).toBeVisible();
    await press();
    await page.mouse.wheel(0, 800);
    expect(await portalScroll()).toBe(0);
  });
});

/**
 * A 240 Hz screen: the page's animation frames come every 4 ms. Counts them,
 * and the frames the board is drawn in.
 */
const HIGH_REFRESH = () => {
  let tick = 0;
  let drawnTick = -1;
  let drawn = 0;
  window.requestAnimationFrame = (callback) =>
    window.setTimeout(() => {
      tick += 1;
      callback(performance.now());
    }, 1000 / 240);
  window.cancelAnimationFrame = (handle) => window.clearTimeout(handle);
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called back on its own context
  const drawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (
    this: CanvasRenderingContext2D,
    ...args: unknown[]
  ) {
    if (this.canvas.dataset.boardWidth && drawnTick !== tick) {
      drawnTick = tick;
      drawn += 1;
    }
    Reflect.apply(drawImage, this, args);
  };
  Object.assign(window, { frames: () => ({ tick, drawn }) });
};

/** Frames a second the screen offered and the board was drawn in, over two seconds of play. */
const measureFrames = async (page: Page) => {
  await page.addInitScript(HIGH_REFRESH);
  await page.addInitScript(() =>
    localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' })),
  );
  await page.goto('./');
  await page.getByTestId('play').click();
  await page.getByTestId('level-nebula-01').click();
  await expect(page.getByTestId('board')).toBeVisible();
  const count = () =>
    page.evaluate(() =>
      (window as unknown as { frames: () => { tick: number; drawn: number } }).frames(),
    );
  const before = await count();
  await page.waitForTimeout(2000);
  const after = await count();
  return { offered: (after.tick - before.tick) / 2, drawn: (after.drawn - before.drawn) / 2 };
};

test.describe('on a touch screen', () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 412, height: 839 } });

  test('draws 60 frames a second at most, however fast the screen', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'mobile project only');
    const { offered, drawn } = await measureFrames(page);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    expect(offered).toBeGreaterThan(100);
    expect(drawn).toBeGreaterThan(30);
    expect(drawn).toBeLessThanOrEqual(62);
  });

  test('picks the board shape again at a restart after the phone was turned', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'mobile project only');
    await page.addInitScript(() =>
      localStorage.setItem('ballmania:settings', JSON.stringify({ locale: 'en' })),
    );
    await page.goto('./');
    await page.getByTestId('play').click();
    await page.getByTestId('level-nebula-01').click();
    const board = page.getByTestId('board');
    await expect(board).toBeVisible();
    const shape = () =>
      board.evaluate((canvas: HTMLCanvasElement) =>
        Number(canvas.dataset.boardWidth) > Number(canvas.dataset.boardHeight) ? 'wide' : 'tall',
      );
    expect(await shape()).toBe('tall');
    await page.setViewportSize({ width: 839, height: 412 });
    await page.getByTestId('pause').click();
    await page.getByTestId('restart').click();
    await expect.poll(shape).toBe('wide');
  });
});

test('draws every frame of a fast screen on a computer', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'desktop project only');
  const { offered, drawn } = await measureFrames(page);
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(false);
  expect(drawn).toBeGreaterThan(Math.min(100, offered * 0.8));
});
