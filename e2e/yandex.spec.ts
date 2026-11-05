import { expect, overflowOf, test, type Page } from './fixtures';

/**
 * The Yandex Games build (version 1.9.0), against a stand-in for Yandex's SDK
 * served at `/sdk.js`: its calls land in `window.yandexLog`, and the player's
 * data on Yandex's servers is `window.yandexData`.
 */
test.use({
  baseURL: `http://localhost:${process.env.E2E_YANDEX_PORT ?? 4276}/`,
  // The saves live on Yandex's servers: nothing is seeded in the browser.
  trained: false,
});

interface StandIn {
  yandexLog: string[];
  yandexData: Record<string, string>;
  yandexEmit: (event: string) => void;
}

interface AdCallbacks {
  onOpen?: () => void;
  onClose?: () => void;
  onRewarded?: () => void;
}

const log = (page: Page) => page.evaluate(() => (window as unknown as StandIn).yandexLog);

/** Yandex's SDK at `/sdk.js`, in the player's language, with the player's data on its servers. */
async function onYandex(
  page: Page,
  { lang = 'en', data = {} }: { lang?: string; data?: Record<string, string> } = {},
) {
  await page.addInitScript(
    ({ lang, data }) => {
      const log: string[] = [];
      const listeners = new Map<string, Array<() => void>>();
      const standIn = window as unknown as StandIn & { yandexStandIn: unknown };
      /** An ad opens, then closes a moment later, rewarding if it is a rewarded one. */
      const ad =
        (name: string, rewards: boolean) =>
        ({ callbacks }: { callbacks: AdCallbacks }) => {
          log.push(name);
          callbacks.onOpen?.();
          setTimeout(() => {
            if (rewards) callbacks.onRewarded?.();
            callbacks.onClose?.();
          }, 300);
        };
      standIn.yandexLog = log;
      standIn.yandexData = data;
      standIn.yandexEmit = (event) => listeners.get(event)?.forEach((listener) => listener());
      standIn.yandexStandIn = {
        init: () =>
          Promise.resolve({
            features: {
              LoadingAPI: { ready: () => log.push('ready') },
              GameplayAPI: { start: () => log.push('start'), stop: () => log.push('stop') },
            },
            environment: { i18n: { lang } },
            adv: {
              showFullscreenAdv: ad('fullscreen', false),
              showRewardedVideo: ad('rewarded', true),
            },
            getPlayer: () =>
              Promise.resolve({
                getData: () => Promise.resolve(standIn.yandexData),
                setData: (next: Record<string, string>) => {
                  standIn.yandexData = { ...next };
                  log.push('setData');
                  return Promise.resolve();
                },
              }),
            on: (event: string, listener: () => void) => {
              listeners.set(event, [...(listeners.get(event) ?? []), listener]);
            },
          }),
      };
    },
    { lang, data },
  );
  // Yandex serves its SDK next to the game; here, the stand-in.
  await page.route('**/sdk.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'window.YaGames = window.yandexStandIn;',
    }),
  );
}

/** A player who finished the training and the first level, known only to Yandex's servers. */
const RETURNING = {
  'ballmania:player': JSON.stringify({
    version: 2,
    training: { step: 1, done: true },
    worlds: ['nebula', 'neon'],
  }),
  'ballmania:progress': JSON.stringify({
    version: 1,
    levels: { 'nebula-01': { stars: 2, best: 1200 } },
  }),
};

/**
 * Rule 1.10 as Yandex checks it on a computer: the game in a window of each of
 * its reference screens (16:9, 16:10, 5:4, ultra-wide), that window shrunk by
 * 20 % on each axis, and zoom from 80 to 125 % (a 1280 × 720 window seen at
 * 125 % is 1024 × 576 CSS pixels, at 80 % 1600 × 900).
 */
const WINDOWS = [
  [1920, 1080],
  [1536, 864],
  [1600, 900],
  [1280, 720],
  [1024, 576],
  [1366, 768],
  [1093, 614],
  [1680, 1050],
  [1344, 840],
  [1280, 1024],
  [1024, 819],
  [2560, 1080],
  [2048, 864],
] as const;

/** How far the page itself scrolls, either way (rule 1.10.2): the game may scroll inside. */
const pageScroll = (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth - root.clientWidth, root.scrollHeight - root.clientHeight);
  });

test.describe('Yandex Games build', () => {
  test('serves its page with the SDK in the head and the title of its listing', async ({
    request,
  }) => {
    const html = await (await request.get('./')).text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Ball Mania — marble shooting reinvented</title>');
    // From the relative path Yandex serves next to the game (rules 1.7 and 1.19.1).
    const sdk = html.indexOf('<script src="/sdk.js"></script>');
    expect(sdk).toBeGreaterThan(-1);
    expect(sdk).toBeLessThan(html.indexOf('</head>'));
    // No other portal's SDK, and no outside host (rule 1.7).
    expect(html).not.toContain('playgama');
    expect(html).not.toContain('crazygames');
  });

  test('speaks the language Yandex gives, and tells it when the game can be played', async ({
    page,
    consoleErrors,
  }) => {
    await onYandex(page, { lang: 'ru' });
    await page.goto('./');
    // A new player plays at once, in the language of their Yandex (rule 2.14).
    await expect(page.getByTestId('board')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page).toHaveTitle(/^Ball Mania.+стрельба шарами/);
    await expect.poll(() => log(page)).toContain('start');
    // Ready once, before the play starts (rules 1.19.2 and 1.19.3).
    const events = await log(page);
    expect(events.filter((event) => event === 'ready')).toHaveLength(1);
    expect(events.indexOf('ready')).toBeLessThan(events.indexOf('start'));
    expect(await consoleErrors()).toEqual([]);
  });

  test('stops the play while Yandex pauses the game, and resumes it after', async ({ page }) => {
    await onYandex(page);
    await page.goto('./');
    await expect(page.getByTestId('board')).toBeVisible();
    await expect.poll(async () => (await log(page)).at(-1)).toBe('start');
    await page.evaluate(() => (window as unknown as StandIn).yandexEmit('game_api_pause'));
    expect((await log(page)).at(-1)).toBe('stop');
    await page.evaluate(() => (window as unknown as StandIn).yandexEmit('game_api_resume'));
    expect((await log(page)).at(-1)).toBe('start');
  });

  test('keeps the progress in the player data on Yandex, not in the browser', async ({ page }) => {
    await onYandex(page, { data: RETURNING });
    await page.goto('./');
    // Known to Yandex only: back on the title screen (rule 1.9).
    await expect(page.getByTestId('play')).toBeVisible();
    await page.getByTestId('gift-collect').click();
    await expect(page.getByTestId('wallet')).toHaveText(/15 shards/);
    await expect.poll(() => log(page)).toContain('setData');
    const saved = await page.evaluate(() => (window as unknown as StandIn).yandexData);
    expect(JSON.parse(saved['ballmania:player'] ?? '{}')).toMatchObject({ shards: 15 });
    expect(saved['ballmania:progress']).toBe(RETURNING['ballmania:progress']);
    expect(await page.evaluate(() => localStorage.getItem('ballmania:player'))).toBeNull();
  });

  test('gives a puzzle hint for a rewarded ad', async ({ page }) => {
    await onYandex(page, { data: RETURNING });
    await page.goto('./');
    await page.getByTestId('arcade').click();
    await page.getByRole('button', { name: 'Puzzles', exact: true }).click();
    await page.getByTestId('puzzle-1').click();
    await expect(page.getByTestId('board')).toBeVisible();
    // Only from the pause menu, a non-game action (rule 4.4).
    await page.getByTestId('pause').click();
    await page.getByTestId('ad-hint').click();
    await expect(page.getByRole('status').filter({ hasText: 'circled marble' })).toBeAttached();
    expect(await log(page)).toContain('rewarded');
  });

  test('shows no version number, and opens no menu on a right click or a long press', async ({
    page,
  }) => {
    await onYandex(page, { data: RETURNING });
    await page.goto('./');
    await expect(page.getByTestId('play')).toBeVisible();
    // Developer information to Yandex (rule 1.14).
    await expect(page.getByTestId('version')).toHaveCount(0);
    // On the title screen too, far from the board (rules 1.6.1.8 and 1.6.2.7).
    const opened = await page.getByTestId('play').evaluate((button) => {
      const press = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      return button.dispatchEvent(press);
    });
    expect(opened).toBe(false);
    await expect(page.locator('body')).toHaveCSS('user-select', 'none');
  });

  test('keeps following the language Yandex gives after a change of settings', async ({ page }) => {
    await onYandex(page, { lang: 'ru', data: RETURNING });
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await page.getByTestId('sound-toggle').click();
    // Yandex in English now: the debug panel's language mock opens the game again (rule 2.14).
    await onYandex(page, { lang: 'en', data: RETURNING });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByTestId('sound-toggle')).toHaveAttribute('aria-pressed', 'true');
  });

  test("fits every window of Yandex's display check, at zoom 80 to 125 %", async ({
    page,
    formFactor,
  }) => {
    test.skip(formFactor !== 'desktop', 'desktop only');
    test.setTimeout(180_000);
    await onYandex(page, { data: RETURNING });
    for (const [width, height] of WINDOWS) {
      const size = `${width} × ${height}`;
      await page.setViewportSize({ width, height });
      await page.goto('./');
      await expect(page.getByTestId('play')).toBeVisible();
      // The title screen holds whole, the two-word title included (rules 1.10.1 and 1.10.4).
      expect(await overflowOf(page), size).toBeLessThanOrEqual(0);
      expect(await pageScroll(page), size).toBeLessThanOrEqual(0);
      await page.getByTestId('play').click();
      await page.getByTestId('level-nebula-01').click();
      await expect(page.getByTestId('board')).toBeVisible();
      expect(await pageScroll(page), size).toBeLessThanOrEqual(0);
      // The playing frame, from the HUD to the buttons, from the top of the window to its
      // bottom: 2:1 at most, and it reaches an edge (rules 1.6.2.1 and 1.6.2.2).
      const frame = await page.evaluate(() => ({
        left: document.querySelector('.hud')!.getBoundingClientRect().left,
        right: document.querySelector('.controls')!.getBoundingClientRect().right,
        height: document.querySelector('.game')!.getBoundingClientRect().height,
      }));
      expect(frame.height, size).toBeCloseTo(height, 0);
      expect((frame.right - frame.left) / frame.height, size).toBeLessThanOrEqual(2.01);
    }
  });
});
